/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */

import { DataBaseSDK } from "./../sdks/DataBaseSDK";
import { Inject, Singleton } from "typescript-ioc";
import * as _ from "lodash";
import axios from "axios";
import SystemSDK from "./../sdks/SystemSDK";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import { FrameworkAPI } from "@project-sunbird/ext-framework-server/api";
import { list } from "./../sdks/GlobalSDK";
import NetworkSDK from "./../sdks/NetworkSDK";
import * as zlib from "zlib";
import * as path from "path";
import * as fs from "fs";
import FileSDK from "./../sdks/FileSDK";
import uuid = require("uuid");

@Singleton
export class TelemetrySyncManager {
  @Inject
  private databaseSdk: DataBaseSDK;
  @Inject
  private frameworkAPI: FrameworkAPI;
  @Inject
  private networkSDK: NetworkSDK;
  @Inject
  private systemSDK: SystemSDK;
  private TELEMETRY_PACKET_SIZE = process.env.TELEMETRY_PACKET_SIZE
    ? parseInt(process.env.TELEMETRY_PACKET_SIZE)
    : 200;

  async batchJob() {
    try {
    } catch (error) {
      logger.error(`while running the telemetry batch job ${error}`);
    }
    const pluginDetails = await list().catch(() => {
      // get the plugins from global registry
      return [];
    });
    if (!pluginDetails.length) {
      return;
    }
    _.forEach(pluginDetails, pluginDetail => {
      this.createTelemetryPacket(pluginDetail.id); // telemetry events by plugin from plugin's  and create the packet
    });
    this.createTelemetryPacket(""); // createTelemetryPacket job for OpenRap telemetry events
  }
  async createTelemetryPacket(pluginId: string) {
    let dbFilters = {
      selector: {},
      limit: this.TELEMETRY_PACKET_SIZE * 10
    };
    let telemetryEvents = { docs: [] };

    if (pluginId) {
      let pluginDbInstance = this.frameworkAPI.getPouchDBInstance(
        pluginId,
        "telemetry"
      );
      telemetryEvents = await pluginDbInstance
        .find(dbFilters)
        .catch(error => logger.error("fetching telemetryEvents failed", error));
      logger.info(
        `telemetry events: , ${telemetryEvents.docs.length} for plugin: ${pluginId}`
      );
    } else {
      telemetryEvents = await this.databaseSdk
        .find("telemetry", dbFilters)
        .catch(error => logger.error("fetching telemetryEvents failed", error));
      logger.info("telemetry events length", telemetryEvents.docs.length);
    }

    if (!telemetryEvents.docs.length) {
      return;
    }
    let updateDIDFlag = process.env.MODE === "standalone";
    let formatedEvents = _.map(telemetryEvents.docs, doc => {
      let omittedDoc = _.omit(doc, ["_id", "_rev"]);
      //here we consider all the events as anonymous usage and updating the uid and did if
      if (updateDIDFlag) {
        let did = this.systemSDK.getDeviceId();
        omittedDoc["actor"]["id"] = did;
        omittedDoc["context"]["did"] = did;
      }
      return omittedDoc;
    });
    const packets = _.chunk(formatedEvents, this.TELEMETRY_PACKET_SIZE).map(
      data => ({
        pluginId: pluginId, // need to be changed
        syncStatus: false,
        createdOn: Date.now(),
        updateOn: Date.now(),
        events: data
      })
    );
    await this.databaseSdk
      .bulkDocs("telemetry_packets", packets) // insert the batch into batch table with plugin-Id and sync status as false
      .catch(error => logger.error("creating packets", error));

    const deleteEvents = _.map(telemetryEvents.docs, data => ({
      _id: data._id,
      _rev: data._rev,
      _deleted: true
    }));

    if (pluginId) {
      let pluginDbInstance = this.frameworkAPI.getPouchDBInstance(
        pluginId,
        "telemetry"
      );
      await pluginDbInstance
        .bulkDocs(deleteEvents) // clean the events in the plugin telemetry table
        .catch(error =>
          logger.error("deleting telemetry events failed", error)
        );
    } else {
      telemetryEvents = await this.databaseSdk
        .bulkDocs("telemetry", deleteEvents)
        .catch(error => logger.error("fetching telemetryEvents failed", error));
      logger.info("deleted telemetry events length", deleteEvents.length);
    }
    this.createTelemetryPacket(pluginId);
  }

  async syncJob() {
    try {
      const networkStatus = await this.networkSDK
        .isInternetAvailable()
        .catch(status => false);
      if (!networkStatus) {
        // check network connectivity with plugin api base url since we try to sync to that endpoint
        logger.warn("sync job failed: network not available");
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
        apiKey = await this.getAPIToken(this.systemSDK.getDeviceId()).catch(
          err => logger.error(`while getting the token ${err}`)
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
      const telemetryPackets = await this.databaseSdk
        .find("telemetry_packets", dbFilters) // get the batches from batch table where sync status is false
        .catch(error =>
          logger.error("fetching telemetryPackets failed", error)
        );
      logger.info("telemetryPackets length", telemetryPackets.docs.length);
      if (!telemetryPackets.docs.length) {
        return;
      }
      for (const telemetryPacket of telemetryPackets.docs) {
        await this.makeSyncApiCall(telemetryPacket, apiKey)
          .then(data => {
            // sync each packet to the plugins  api base url
            logger.info(
              `${JSON.stringify(data)} telemetry synced for  packet ${
                telemetryPacket._id
              } of events ${telemetryPacket.events.length}`
            ); // on successful sync update the batch sync status to true
            return this.databaseSdk.updateDoc(
              "telemetry_packets",
              telemetryPacket._id,
              { syncStatus: true }
            );
          })
          .catch(err => {
            logger.error(
              `error while syncing packets to telemetry service for  packet ${telemetryPacket._id} of events ${telemetryPacket.events.length}`
            );
          });
      }
    } catch (error) {
      logger.error(`while running the telemetry sync job ${error}`);
    }
  }
  async makeSyncApiCall(packet, apiKey) {
    let headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      did: this.systemSDK.getDeviceId(),
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
        let { pluginId, events, _id, _rev } = batch;
        let fileSDK = new FileSDK(pluginId);
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
                events.length +
                  " events are wrote to file " +
                  filePath +
                  " and  deleting events from telemetry database"
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
      //TODO: need to delete older archived files
      //delete if the file is archived file is older than 10 days
      // let archiveFolderPath = fileSDK.getAbsPath('telemetry_archived');
      // fs.readdir(archiveFolderPath, (err, files) => {
      //     //filter gz files
      //     let gzfiles =

      // })
    } catch (error) {
      logger.error(`while running the telemetry cleanup job ${error}`);
    }
  }
  async getAPIToken(deviceId = this.systemSDK.getDeviceId()) {
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
