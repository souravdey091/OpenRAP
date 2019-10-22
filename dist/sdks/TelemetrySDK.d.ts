import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
export default class TelemetrySDK {
    private telemetryInstance;
    getInstance(): TelemetryInstance;
    send(events: any[]): Promise<any>;
}
