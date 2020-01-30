import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
export default class TelemetrySDK {
    private telemetryInstance;
    private telemetryExport;
    getInstance(): TelemetryInstance;
    send(events: any[]): Promise<any>;
    export(destPath: string, cb: any): Promise<void>;
    info(cb: any): Promise<void>;
}
