import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
import { TelemetryExport } from './../services/telemetry/TelemetryExport';
import { Inject } from "typescript-ioc";

export default class TelemetrySDK {
  @Inject private telemetryInstance: TelemetryInstance;
  @Inject private telemetryExport: TelemetryExport;

  getInstance() {
    return this.telemetryInstance;
  }

  send(events: any[]): Promise<any> {
    return this.telemetryInstance.send(events);
  }

  export(destPath: string, cb) {
    return this.telemetryExport.export(destPath, cb);
  }

  info(cb) {
    return this.telemetryExport.info(cb)
  }
}
