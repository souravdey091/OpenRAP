/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
export declare class TelemetryManager {
    private networkQueue;
    private databaseSdk;
    private systemSDK;
    private telemetryInstance;
    private settingSDK;
    private TELEMETRY_PACKET_SIZE;
    private ARCHIVE_EXPIRY_TIME;
    registerDevice(): void;
    migrateTelemetryPacketToQueueDB(): Promise<void>;
    batchJob(): Promise<void>;
    archive(): Promise<void>;
}
