import { telemetryInstance } from "./../services";

export default class TelemetrySDK {
  getInstance() {
    return telemetryInstance;
  }

  send(events: any[]) {
    telemetryInstance.dispatcher(events);
  }
}
