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
    private concurrency;
    private queueList;
    private running;
    private retryCount;
    private queueInProgress;
    add(doc: IAdd, docId?: string): any;
    read(): Promise<void>;
    execute(): void;
    makeHTTPCall(headers: object, body: object, pathToApi: string): Promise<any>;
    logTelemetryError(error: any, errType?: string): void;
}
export interface IAdd {
    subType: string;
    pathToApi: string;
    requestHeaderObj: object;
    requestBody: any;
}
