import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
import { TelemetryExport } from './../services/telemetry/TelemetryExport';
import { Inject } from "typescript-ioc";

export default class TelemetrySDK {
  @Inject
  private telemetryInstance: TelemetryInstance;

  getInstance() {
    return this.telemetryInstance;
  }

  send(events: any[]): Promise<any> {
    return this.telemetryInstance.send(events);
  }

  export(destPath: string, cb) {
    return new TelemetryExport(destPath).export(cb);
  }

  info(cb) {
    return new TelemetryExport().info(cb);
  }
}
