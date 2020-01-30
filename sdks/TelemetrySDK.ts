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
    return this.getExportInstance(destPath).export(cb);
  }

  info(cb) {
    return this.getExportInstance().info(cb);
  }

  getExportInstance(destPath?: string) {
    return new TelemetryExport(destPath);
  }
}
