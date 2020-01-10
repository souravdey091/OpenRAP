/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */

import { DataBaseSDK } from "./../sdks/DataBaseSDK";
import { Inject, Singleton } from "typescript-ioc";
import * as _ from "lodash";
import SystemSDK from "./../sdks/SystemSDK";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import * as zlib from "zlib";
import * as path from "path";
import * as fs from "fs";
import FileSDK from "./../sdks/FileSDK";
import uuid = require("uuid");
import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
import { HTTPService } from "@project-sunbird/ext-framework-server/services";
import SettingSDK from "./../sdks/SettingSDK";
import { NetworkQueue, NETWORK_SUBTYPE } from './../services/queue/networkQueue';
import { QUEUE_TYPE } from './../services/queue/queue';

@Singleton
export class TelemetrySyncManager {
  @Inject
  private networkQueue: NetworkQueue;
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
      if (_.isEmpty(userDeclaredLocation)) {
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

  async getApiKey() {
    let did = await this.systemSDK.getDeviceId();
    let apiKey: any;
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
    return apiKey;
  }

  async migrateTelemetryPacketToQueueDB() {
    try {
      let telemetryPackets = await this.databaseSdk.find("telemetry_packets", {
        selector: {
          syncStatus: false
        },
        limit: 100
      });

      if (!telemetryPackets || telemetryPackets.docs.length === 0) {
        return;
      }

      for (const telemetryPacket of telemetryPackets.docs) {
        let apiKey = await this.getApiKey();
        if (!apiKey) {
          logger.error("Api key not available");
          return;
        }

        let did = await this.systemSDK.getDeviceId();
        let headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          did: did,
          msgid: uuid.v4()
        };

        const packet = {
          pathToApi: '/api/data/v1/telemetry',
          requestHeaderObj: headers,
          requestBody: Buffer.from(JSON.stringify({ ts: Date.now(), events: _.get(telemetryPacket, 'events'), id: "api.telemetry", ver: "1.0" })),
          subType: NETWORK_SUBTYPE.Telemetry
        };

        // Inserting to Queue DB
        await this.networkQueue.add(packet)
          .then(data => {
            logger.info('Adding to Queue db successful from telemetry packet db');
            return this.databaseSdk.updateDoc("telemetry_packets", telemetryPacket._id, { syncStatus: true, _deleted: true });
          })
          .catch(err => {
            logger.error("Adding to queue Db failed while migrating from telemetry packet db", err);
          });
      }
    } catch (error) {
      logger.error(`Got error while migrating telemetry packet db data to queue db ${error}`);
      this.networkQueue.logTelemetryError(error);
    }
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

      // create request data for add method in network queue
      let apiKey = await this.getApiKey();
      if (!apiKey) {
        logger.error("Api key not available");
        return;
      }

      let headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        did: did,
        msgid: uuid.v4()
      };

      const packets = _.chunk(formatedEvents, this.TELEMETRY_PACKET_SIZE).map(
        data => ({
          pathToApi: '/api/data/v1/telemetry',
          requestHeaderObj: headers,
          requestBody: Buffer.from(JSON.stringify({ ts: Date.now(), events: data, id: "api.telemetry", ver: "1.0" })),
          subType: NETWORK_SUBTYPE.Telemetry
        })
      );

      // Inserting to DB
      _.forEach(packets, async (packet) => {
        await this.networkQueue.add(packet);
      })

      logger.info(`Adding ${packets.length} packets to queue DB`);
      const deleteEvents = _.map(telemetryEvents.docs, data => ({
        _id: data._id,
        _rev: data._rev,
        _deleted: true
      }));
      telemetryEvents = await this.databaseSdk.bulkDocs(
        "telemetry",
        deleteEvents
      );
      logger.info(
        `Deleted telemetry events of size ${deleteEvents.length} from telemetry db`
      );
    } catch (error) {
      logger.error(`Error while batching the telemetry events = ${error}`);
      this.networkQueue.logTelemetryError(error);
    }
  }

  // Clean up job implementation
  async cleanUpJob() {
    try {
      // get the batches from telemetry batch table where sync status is true
      let batches: any = await this.networkQueue.get({
        selector: {
          syncStatus: true,
          type: QUEUE_TYPE.Network,
          subType: NETWORK_SUBTYPE.Telemetry
        }
      }
      );

      for (const batch of batches) {
        // create gz file with name as batch id with that batch data an store it to telemetry-archive folder
        // delete the files which are created 10 days back
        let { requestBody, _id } = batch;
        let buffer = Buffer.from(requestBody.data);
        let apiRequestBody = JSON.parse(buffer.toString('utf8'));
        let data = _.get(apiRequestBody, 'events');

        let fileSDK = new FileSDK("");
        zlib.gzip(JSON.stringify(data), async (error, result) => {
          if (error) {
            logger.error(`While creating gzip object for telemetry object ${error}`);
            this.networkQueue.logTelemetryError(error);
          } else {
            await fileSDK.mkdir("telemetry_archived");
            let filePath = fileSDK.getAbsPath(
              path.join("telemetry_archived", _id + "." + Date.now() + ".gz")
            );
            let wstream = fs.createWriteStream(filePath);
            wstream.write(result);
            wstream.end();
            wstream.on("finish", async () => {
              logger.info(`${data.length} events are wrote to file ${filePath} and  deleting events from telemetry database`);
              await this.networkQueue.update(_id, { _deleted: true })
                .catch(err => {
                  logger.error("While deleting the telemetry batch events  from database after creating zip", err);
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
            params: [{ packet: batch._id }, { size: data.length }]
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
          logger.error(`While filtering gz files = ${error}`);
          this.networkQueue.logTelemetryError(error);
        } else if (files.length !== 0) {
          let now = Date.now();
          let expiry = this.ARCHIVE_EXPIRY_TIME * 86400;
          for (const file of files) {
            let fileArr = file.split(".");

            let createdOn = Number(fileArr[fileArr.length - 2]);
            if ((now - createdOn) / 1000 > expiry) {
              logger.info(`deleting file ${file} which is created on ${createdOn}`);
              fileSDK.remove(path.join("telemetry_archived", file));
            }
          }
        }
      });
    } catch (error) {
      logger.error(`while running the telemetry cleanup job ${error}`);
      this.networkQueue.logTelemetryError(error);
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
