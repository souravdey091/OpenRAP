/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */

import { DataBaseSDK } from "./../sdks/DataBaseSDK";
import { Inject, Singleton } from "typescript-ioc";
import * as _ from "lodash";
import axios from "axios";
import SystemSDK from "./../sdks/SystemSDK";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import NetworkSDK from "./../sdks/NetworkSDK";
import * as zlib from "zlib";
import * as path from "path";
import * as fs from "fs";
import FileSDK from "./../sdks/FileSDK";

@Singleton
export class TelemetrySyncManager {
  @Inject
  private databaseSdk: DataBaseSDK;
  @Inject
  private networkSDK: NetworkSDK;
  @Inject
  private systemSDK: SystemSDK;

  private TELEMETRY_PACKET_SIZE =
    parseInt(process.env.TELEMETRY_PACKET_SIZE) || 200;

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
          events: data
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
      logger.info(
        `Deleted telemetry events of size ${deleteEvents.length} from telemetry db`
      );
    } catch (error) {
      logger.error(`error while batching the telemetry events`, error);
    }
  }

  async syncJob() {
    try {
      const networkStatus = await this.networkSDK.isInternetAvailable();
      if (!networkStatus) {
        // check network connectivity with plugin api base url since we try to sync to that endpoint
        logger.warn("sync job failed: internet is not available");
        return;
      }
      let apiKey;

      try {
        let { api_key } = await this.databaseSdk.getDoc(
          "settings",
          "device_token"
        );
        apiKey = api_key;
      } catch (error) {
        logger.warn("device token is not set getting it from api", error);
        let did = await this.systemSDK.getDeviceId();
        apiKey = await this.getAPIToken(did).catch(err =>
          logger.error(`while getting the token ${err}`)
        );
      }

      if (!apiKey) {
        logger.error("sync job failed: api_key not available");
        return;
      }
      let dbFilters = {
        selector: {
          syncStatus: false
        },
        limit: 100
      };
      let telemetryPackets = await this.databaseSdk.find(
        "telemetry_packets",
        dbFilters
      );
      telemetryPackets = telemetryPackets || { docs: [] };
      if (telemetryPackets.length === 0) {
        return;
      }
      logger.info(
        "Syncing telemetry packets of size",
        telemetryPackets.docs.length
      );
      let did = await this.systemSDK.getDeviceId();

      for (const telemetryPacket of telemetryPackets.docs) {
        await this.syncTelemetryPackets(telemetryPacket, apiKey, did)
          .then(data => {
            // sync each packet to the plugins  api base url
            logger.info(
              `Telemetry synced for  packet ${telemetryPacket._id} of ${telemetryPacket.events.length} events`
            ); // on successful sync update the batch sync status to true
            return this.databaseSdk.updateDoc(
              "telemetry_packets",
              telemetryPacket._id,
              { syncStatus: true }
            );
          })
          .catch(err => {
            logger.error(
              `Error while syncing to telemetry service for packetId ${telemetryPacket._id} of ${telemetryPacket.events.length} events`,
              err.message
            );
          });
      }
    } catch (error) {
      logger.error(`while running the telemetry sync job `, error);
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
    return await axios.post(
      process.env.APP_BASE_URL + "/api/data/v1/telemetry",
      body,
      { headers: headers }
    );
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
      }
    } catch (error) {
      logger.error(`while running the telemetry cleanup job ${error}`);
    }
    //TODO: need to delete older archived files
    //delete if the file is archived file is older than 10 days
    // let archiveFolderPath = this.fileSDK.getAbsPath('telemetry_archived');
    // fs.readdir(archiveFolderPath, (err, files) => {
    //     //filter gz files
    //     let gzfiles =

    // })
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
