import { Queue } from './queue';
import { IQuery } from './IQueue';
export declare enum NETWORK_SUBTYPE {
    Telemetry = "TELEMETRY"
}
export declare class NetworkQueue extends Queue {
    private networkSDK;
    private telemetryInstance;
    queueInProgress: boolean;
    init(interval: number): void;
    add(doc: IAdd, docId?: string): any;
    update(docId: string, query: object): Promise<any>;
    get(query: IQuery): any;
    executeQueue(): Promise<void>;
    syncToServer(headers: object, body: object, pathToApi: string): Promise<import("@project-sunbird/ext-framework-server/services/http-service").IHttpResponse>;
    logTelemetryError(error: any): void;
}
export interface IAdd {
    subType: string;
    pathToApi: string;
    requestHeaderObj: object;
    requestBody: Buffer;
}
