import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
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
}
