/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
export declare class TelemetrySyncManager {
    private databaseSdk;
    private systemSDK;
    private telemetryInstance;
    private settingSDK;
    private TELEMETRY_PACKET_SIZE;
    private ARCHIVE_EXPIRY_TIME;
    registerDevice(): void;
    batchJob(): Promise<void>;
    syncJob(): Promise<void>;
    syncTelemetryPackets(packet: any, apiKey: any, did: any): Promise<import("../../../../../../Users/harishkumargangula/Documents/Workspace/OpenRAP/node_modules/@project-sunbird/ext-framework-server/services/http-service").IHttpResponse>;
    cleanUpJob(): Promise<void>;
    getAPIToken(deviceId: any): Promise<string>;
}
