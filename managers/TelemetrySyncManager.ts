/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */

import { DataBaseSDK } from "./../sdks/DataBaseSDK";
import { Inject, Singleton } from "typescript-ioc";
import * as _ from "lodash";
import SystemSDK from "./../sdks/SystemSDK";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import NetworkSDK from "./../sdks/NetworkSDK";
import * as zlib from "zlib";
import * as path from "path";
import * as fs from "fs";
import FileSDK from "./../sdks/FileSDK";
import uuid = require("uuid");
import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
import { HTTPService } from "@project-sunbird/ext-framework-server/services";
import SettingSDK from "./../sdks/SettingSDK";

@Singleton
export class TelemetrySyncManager {
  @Inject
  private databaseSdk: DataBaseSDK;
  @Inject
  private systemSDK: SystemSDK;
  @Inject
  private telemetryInstance: TelemetryInstance;
  private settingSDK = new SettingSDK('openrap-sunbirded-plugin');
  private TELEMETRY_PACKET_SIZE =
    parseInt(process.env.TELEMETRY_PACKET_SIZE) || 200;

  private ARCHIVE_EXPIRY_TIME = 10; // in days

  registerDevice() {
    var interval = setInterval(async () => {
      let deviceId = await this.systemSDK.getDeviceId();
      let deviceSpec = await this.systemSDK.getDeviceInfo();
      let userDeclaredLocation = await this.settingSDK.get('location').catch(err => logger.error('Error while fetching user Location in registerDevice, error:', err.message));
      if(_.isEmpty(userDeclaredLocation)){
        return;
      }
      let body = {
        id: process.env.APP_ID,
        ver: process.env.APP_VERSION,
        ts: new Date().toISOString(),
        params: {
          msgid: uuid.v4()
        },
        request: {
          channel: process.env.CHANNEL,
          producer: process.env.APP_ID,
          dspec: deviceSpec,
          userDeclaredLocation: {
            state: _.get(userDeclaredLocation, 'state.name'),
            district: _.get(userDeclaredLocation, 'city.name')
          }
        }
      };
      HTTPService.post(`${process.env.DEVICE_REGISTRY_URL}/${deviceId}`, body, {
        headers: {
          "Content-Type": "application/json"
        }
      })
        .toPromise()
        .then(data => {
          logger.info(`device registred successfully ${data.status}`);
          clearInterval(interval);
        })
        .catch(error => {
          logger.error(`Unable to sync device data: ${error.message}`);
        });
    }, 30000);
  }

  async batchJob() {
    try {
      let did = await this.systemSDK.getDeviceId();
      let dbFilters = {
        selector: {},
        limit: this.TELEMETRY_PACKET_SIZE * 100
      };
      let telemetryEvents = await this.databaseSdk.find("telemetry", dbFilters);
      if (telemetryEvents.docs.length === 0) return;
      logger.info(
        `Batching telemetry events size ${telemetryEvents.docs.length} of chunk size each ${this.TELEMETRY_PACKET_SIZE}`
      );
      let updateDIDFlag = process.env.MODE === "standalone";
      let formatedEvents = _.map(telemetryEvents.docs, doc => {
        let omittedDoc = _.omit(doc, ["_id", "_rev"]);
        //here we consider all the events as anonymous usage and updating the uid and did if
        if (updateDIDFlag) {
          omittedDoc["actor"]["id"] = did;
          omittedDoc["context"]["did"] = did;
        }
        return omittedDoc;
      });
      const packets = _.chunk(formatedEvents, this.TELEMETRY_PACKET_SIZE).map(
        data => ({
          syncStatus: false,
          createdOn: Date.now(),
          updateOn: Date.now(),
          events: data,
          _id: uuid.v4()
        })
      );
      await this.databaseSdk.bulkDocs("telemetry_packets", packets);
      logger.info(`Adding ${packets.length} packets to  telemetry_packets DB`);
      const deleteEvents = _.map(telemetryEvents.docs, data => ({
        _id: data._id,
        _rev: data._rev,
        _deleted: true
      }));
      telemetryEvents = await this.databaseSdk.bulkDocs(
        "telemetry",
        deleteEvents
      );

      for (const packet of packets) {
        const logEvent = {
          context: {
            env: "telemetryManager"
          },
          edata: {
            level: "INFO",
            type: "JOB",
            message: "Batching the telemetry  events",
            params: [{ packet: packet._id }, { size: packet.events.length }]
          }
        };
        this.telemetryInstance.log(logEvent);
      }
      logger.info(
        `Deleted telemetry events of size ${deleteEvents.length} from telemetry db`
      );
    } catch (error) {
      const errorEvent = {
        context: {
          env: "telemetryManager"
        },
        edata: {
          err: "SERVER_ERROR",
          errtype: "SYSTEM",
          stacktrace: (
            error.stack ||
            error.stacktrace ||
            error.message ||
            ""
          ).toString()
        }
      };
      this.telemetryInstance.error(errorEvent);
      logger.error(`error while batching the telemetry events`, error);
    }
  }

  async syncJob() {
    try {
      let apiKey;
      let did = await this.systemSDK.getDeviceId();

      try {
        let { api_key } = await this.databaseSdk.getDoc(
          "settings",
          "device_token"
        );
        apiKey = api_key;
      } catch (error) {
        logger.warn("device token is not set getting it from api", error);
        apiKey = await this.getAPIToken(did).catch(err =>
          logger.error(`while getting the token ${err}`)
        );
      }

      if (!apiKey) {
        logger.error("sync job failed: api_key not available");
        return;
      }
      let telemetryPackets = await this.databaseSdk.find("telemetry_packets", {
        selector: {
          syncStatus: false
        },
        limit: 100
      });
      if (!telemetryPackets || telemetryPackets.docs.length === 0) {
        return;
      }
      logger.info(
        "Syncing telemetry packets of size",
        telemetryPackets.docs.length
      );
      let isInitialSyncSuccessful = false;
      let packet = telemetryPackets.docs.pop();
      await this.syncTelemetryPackets(packet, apiKey, did)
        .then(data => {
          isInitialSyncSuccessful = true;
          const logEvent = {
            context: {
              env: "telemetryManager"
            },
            edata: {
              level: "INFO",
              type: "JOB",
              message: "Syncing the telemetry events to server",
              params: [{ packet: packet._id }, { size: packet.events.length }]
            }
          };
          this.telemetryInstance.log(logEvent);
          // sync each packet to the plugins  api base url
          logger.info(
            `Telemetry synced for  packet ${packet._id} of ${packet.events.length} events`
          ); // on successful sync update the batch sync status to true
          return this.databaseSdk.updateDoc("telemetry_packets", packet._id, {
            syncStatus: true
          });
        })
        .catch(error => {
          logger.error(
            `Error while syncing to telemetry service for packetId ${packet._id} of ${packet.events.length} events`,
            error.message
          );
          const errorEvent = {
            context: {
              env: "telemetryManager"
            },
            edata: {
              err: "SERVER_ERROR",
              errtype: "SYSTEM",
              stacktrace: (
                error.stack ||
                error.stacktrace ||
                error.message ||
                ""
              ).toString()
            }
          };
          this.telemetryInstance.error(errorEvent);
        });
      if (isInitialSyncSuccessful) {
        for (const telemetryPacket of telemetryPackets.docs) {
          await this.syncTelemetryPackets(telemetryPacket, apiKey, did)
            .then(data => {
              // sync each packet to the plugins  api base url
              logger.info(
                `Telemetry synced for  packet ${telemetryPacket._id} of ${telemetryPacket.events.length} events`
              );
              const logEvent = {
                context: {
                  env: "telemetryManager"
                },
                edata: {
                  level: "INFO",
                  type: "JOB",
                  message: "Syncing the telemetry events to server",
                  params: [
                    { packet: telemetryPacket._id },
                    { size: telemetryPacket.events.length }
                  ]
                }
              };
              this.telemetryInstance.log(logEvent);
              // on successful sync update the batch sync status to true

              return this.databaseSdk.updateDoc(
                "telemetry_packets",
                telemetryPacket._id,
                { syncStatus: true }
              );
            })
            .catch(error => {
              logger.error(
                `Error while syncing to telemetry service for packetId ${telemetryPacket._id} of ${telemetryPacket.events.length} events`,
                error.message
              );
              const errorEvent = {
                context: {
                  env: "telemetryManager"
                },
                edata: {
                  err: "SERVER_ERROR",
                  errtype: "SYSTEM",
                  stacktrace: (
                    error.stack ||
                    error.stacktrace ||
                    error.message ||
                    ""
                  ).toString()
                }
              };
              this.telemetryInstance.error(errorEvent);
            });
        }
      }
    } catch (error) {
      logger.error(`while running the telemetry sync job `, error);
      const errorEvent = {
        context: {
          env: "telemetryManager"
        },
        edata: {
          err: "SERVER_ERROR",
          errtype: "SYSTEM",
          stacktrace: (
            error.stack ||
            error.stacktrace ||
            error.message ||
            ""
          ).toString()
        }
      };
      this.telemetryInstance.error(errorEvent);
    }
  }
  async syncTelemetryPackets(packet, apiKey, did) {
    let headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      did: did,
      msgid: packet["_id"]
    };
    let body = {
      ts: Date.now(),
      events: packet.events,
      id: "api.telemetry",
      ver: "1.0"
    };
    return await HTTPService.post(
      process.env.APP_BASE_URL + "/api/data/v1/telemetry",
      body,
      { headers: headers }
    ).toPromise();
  }
  // Clean up job implementation

  async cleanUpJob() {
    try {
      // get the batches from telemetry batch table where sync status is true
      let { docs: batches = [] } = await this.databaseSdk.find(
        "telemetry_packets",
        {
          selector: {
            syncStatus: true
          }
        }
      );

      for (const batch of batches) {
        // create gz file with name as batch id with that batch data an store it to telemetry-archive folder
        // delete the files which are created 10 days back
        let { events, _id, _rev } = batch;
        let fileSDK = new FileSDK("");
        zlib.gzip(JSON.stringify(events), async (error, result) => {
          if (error) {
            logger.error(
              `While creating gzip object for telemetry object ${error}`
            );
          } else {
            await fileSDK.mkdir("telemetry_archived");
            let filePath = fileSDK.getAbsPath(
              path.join("telemetry_archived", _id + "." + Date.now() + ".gz")
            );
            let wstream = fs.createWriteStream(filePath);
            wstream.write(result);
            wstream.end();
            wstream.on("finish", async () => {
              logger.info(
                `${events.length} events are wrote to file ${filePath} and  deleting events from telemetry database`
              );
              await this.databaseSdk
                .bulkDocs("telemetry_packets", [
                  {
                    _id: _id,
                    _rev: _rev,
                    _deleted: true
                  }
                ])
                .catch(err => {
                  logger.error(
                    "While deleting the telemetry batch events  from database after creating zip",
                    err
                  );
                });
            });
          }
        });
        const logEvent = {
          context: {
            env: "telemetryManager"
          },
          edata: {
            level: "INFO",
            type: "JOB",
            message: "Archived the telemetry events to file system",
            params: [{ packet: batch._id }, { size: batch.events.length }]
          }
        };
        this.telemetryInstance.log(logEvent);
      }

      //delete if the file is archived file is older than 10 days
      let fileSDK = new FileSDK("");
      let archiveFolderPath = fileSDK.getAbsPath("telemetry_archived");
      fs.readdir(archiveFolderPath, (error, files) => {
        //filter gz files
        if (error) {
          const errorEvent = {
            context: {
              env: "telemetryManager"
            },
            edata: {
              err: "SERVER_ERROR",
              errtype: "SYSTEM",
              stacktrace: (error.stack || error.message || "").toString()
            }
          };
          this.telemetryInstance.error(errorEvent);
        } else if (files.length !== 0) {
          let now = Date.now();
          let expiry = this.ARCHIVE_EXPIRY_TIME * 86400;
          for (const file of files) {
            let fileArr = file.split(".");

            let createdOn = Number(fileArr[fileArr.length - 2]);
            if ((now - createdOn) / 1000 > expiry) {
              logger.info(
                `deleting file ${file} which is created on ${createdOn}`
              );
              fileSDK.remove(path.join("telemetry_archived", file));
            }
          }
        }
      });
    } catch (error) {
      logger.error(`while running the telemetry cleanup job ${error}`);
      const errorEvent = {
        context: {
          env: "telemetryManager"
        },
        edata: {
          err: "SERVER_ERROR",
          errtype: "SYSTEM",
          stacktrace: (
            error.stack ||
            error.stacktrace ||
            error.message ||
            ""
          ).toString()
        }
      };
      this.telemetryInstance.error(errorEvent);
    }
  }
  async getAPIToken(deviceId) {
    //const apiKey =;
    //let token = Buffer.from(apiKey, 'base64').toString('ascii');
    // if (process.env.APP_BASE_URL_TOKEN && deviceId) {
    //   let headers = {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${process.env.APP_BASE_URL_TOKEN}`
    //   };
    //   let body = {
    //     id: "api.device.register",
    //     ver: "1.0",
    //     ts: Date.now(),
    //     request: {
    //       key: deviceId
    //     }
    //   };
    //   let response = await axios
    //     .post(
    //       process.env.APP_BASE_URL +
    //         "/api/api-manager/v1/consumer/mobile_device/credential/register",
    //       body,
    //       { headers: headers }
    //     )
    //     .catch(err => {
    //       logger.error(
    //         `Error while registering the device status ${
    //           err.response.status
    //         } data ${err.response.data}`
    //       );
    //       throw Error(err);
    //     });
    //   let key = _.get(response, "data.result.key");
    //   let secret = _.get(response, "data.result.secret");
    //   let apiKey = jwt.sign({ iss: key }, secret, { algorithm: "HS256" });
    //   await this.databaseSdk
    //     .upsertDoc("settings", "device_token", { api_key: apiKey })
    //     .catch(err => {
    //       logger.error("while inserting the api key to the  database", err);
    //     });
    return Promise.resolve(process.env.APP_BASE_URL_TOKEN);
    // } else {
    //   throw Error(`token or deviceID missing to register device ${deviceId}`);
    // }
  }
}
