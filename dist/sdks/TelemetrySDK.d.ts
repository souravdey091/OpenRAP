import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
import { TelemetryExport } from './../services/telemetry/TelemetryExport';
export default class TelemetrySDK {
    private telemetryInstance;
    getInstance(): TelemetryInstance;
    send(events: any[]): Promise<any>;
    export(destPath: string, cb: any): Promise<void>;
    info(cb: any): Promise<void>;
    getExportInstance(destPath?: string): TelemetryExport;
}
