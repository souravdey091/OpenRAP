import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
export default class TelemetrySDK {
    private telemetryInstance;
    private telemetryExport;
    private settingSDK;
    getInstance(): TelemetryInstance;
    send(events: any[]): Promise<any>;
    export(destPath: string, cb: any): Promise<void>;
    info(cb: any): Promise<void>;
    setTelemetryConfigSyncToServer(syncToServer: boolean): Promise<boolean | TelemetrySDKError>;
    getTelemetryConfigSyncToServer(): Promise<{} | {
        syncToServer: boolean;
    }>;
}
export interface TelemetrySDKError {
    code: string;
    status: number;
    message: string;
}
