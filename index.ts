import { DataBaseSDK } from "./sdks/DataBaseSDK";
import * as fs from "fs";
import * as path from "path";
import * as _ from "lodash";
import { reconciliation as DownloadManagerReconciliation } from "./managers/DownloadManager/DownloadManager";
import NetworkSDK from "./sdks/NetworkSDK";
import { TelemetryManager } from "./managers/TelemetryManager";
import { NetworkQueue } from './services/queue/networkQueue';
import { Inject } from "typescript-ioc";

export class App {
  @Inject static networkQueue: NetworkQueue;
  @Inject static telemetryManager: TelemetryManager;
  public static async  bootstrap(){
    // initialize the telemetry instance, to get it in other modules
  
    // create databases for the container
    let dataBase = new DataBaseSDK();
    let schema = JSON.parse(
      fs.readFileSync(path.join(__dirname, "db", "schemas.json"), {
        encoding: "utf8"
      })
    );
    let databases = schema.databases;
    for (const db of databases) {
      dataBase.createDB(db.name);
    }
  
    for (const db of databases) {
      if (!_.isEmpty(db["indexes"])) {
        for (const index of db.indexes) {
          await dataBase.createIndex(db.name, index);
        }
      }
    }
    await DownloadManagerReconciliation();
    let interval = parseInt(process.env.TELEMETRY_SYNC_INTERVAL_IN_SECS) * 1000 || 30000;
    this.telemetryManager.registerDevice();
    setTimeout(() => { this.telemetryManager.migrateTelemetryPacketToQueueDB() }, interval);
    setTimeout(() => { this.telemetryManager.createTelemetryArchive() }, interval);
    setInterval(() => this.telemetryManager.batchJob(), interval);
    setInterval(() => this.networkQueue.read(), interval);
    // initialize the network sdk to emit the internet available or disconnected events
    new NetworkSDK();
  };
}

