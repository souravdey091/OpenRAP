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
    private concurrency;
    private queueList;
    private running;
    private retryCount;
    private queueInProgress;
    apiKey: string;
    add(doc: IAdd, docId?: string): Promise<any>;
    start(): Promise<void>;
    private execute;
    private makeHTTPCall;
    private getApiKey;
    private getAPIToken;
    logTelemetryError(error: any, errType?: string): void;
}
export interface IAdd {
    bearerToken: boolean;
    subType: string;
    pathToApi: string;
    requestHeaderObj: object;
    requestBody: any;
    count?: number;
}
