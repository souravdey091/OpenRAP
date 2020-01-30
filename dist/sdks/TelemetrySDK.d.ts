import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
import { TelemetryExport } from './../services/telemetry/TelemetryExport';
export default class TelemetrySDK {
    private telemetryInstance;
    getInstance(): TelemetryInstance;
    send(events: any[]): Promise<any>;
    getExportInstance(destPath?: string): TelemetryExport;
}
