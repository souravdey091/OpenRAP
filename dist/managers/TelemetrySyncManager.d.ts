/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
export declare class TelemetrySyncManager {
    private databaseSdk;
    private frameworkAPI;
    private networkSDK;
    private systemSDK;
    private TELEMETRY_PACKET_SIZE;
    batchJob(): Promise<void>;
    createTelemetryPacket(pluginId: string): Promise<void>;
    syncJob(): Promise<void>;
    makeSyncApiCall(packet: any, apiKey: any): Promise<import("../../../../../../Users/harishkumargangula/Documents/Workspace/OpenRAP/node_modules/axios").AxiosResponse<any>>;
    cleanUpJob(): Promise<void>;
    getAPIToken(deviceId?: any): Promise<string>;
}
