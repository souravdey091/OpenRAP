import { Queue } from './queue';
export declare enum NETWORK_SUBTYPE {
    Telemetry = "TELEMETRY"
}
export declare enum PRIORITY {
    first = 1
}
export declare class NetworkQueue extends Queue {
    private networkSDK;
    private telemetryInstance;
    private systemSDK;
    private databaseSdk;
    private settingSDK;
    private concurrency;
    private queueList;
    private running;
    private retryCount;
    private queueInProgress;
    private apiKey;
    private excludeSubType;
    setSubType(): Promise<void>;
    add(doc: NetworkQueueReq, docId?: string): Promise<any>;
    start(): Promise<void>;
    private execute;
    private makeHTTPCall;
    private getApiKey;
    private getAPIToken;
    forceSync(subType: string[]): Promise<string>;
    private setForceSyncInfo;
    private executeForceSync;
    logTelemetryError(error: any, errType?: string): void;
}
export interface NetworkQueueReq {
    bearerToken: boolean;
    subType: string;
    pathToApi: string;
    requestHeaderObj: object;
    requestBody: any;
    count?: number;
}
