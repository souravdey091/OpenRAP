import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
export default class TelemetrySDK {
    private telemetryInstance;
    private telemetryExport;
    private settingSDK;
    private cb;
    getInstance(): TelemetryInstance;
    send(events: any[]): Promise<any>;
    export(destPath: string, cb: any): Promise<void>;
    info(cb: any): Promise<void>;
    setIsTelemetrySyncToServer(syncToServer: boolean, cb: any): void;
    getIsTelemetrySyncToServer(cb: any): Promise<void>;
}
