/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
export declare class TelemetrySyncManager {
    private networkQueue;
    private databaseSdk;
    private systemSDK;
    private telemetryInstance;
    private settingSDK;
    private TELEMETRY_PACKET_SIZE;
    private ARCHIVE_EXPIRY_TIME;
    registerDevice(): void;
    getApiKey(): Promise<any>;
    batchJob(): Promise<void>;
    cleanUpJob(): Promise<void>;
    getAPIToken(deviceId: any): Promise<string>;
}
