import { Queue } from './queue';
export declare class NetworkQueue extends Queue {
    private networkSDK;
    private telemetryInstance;
    add(doc: IAdd): any;
    update(docId: string, query: object): Promise<any>;
    get(query: object): Promise<any>;
    executeQueue(): Promise<void>;
    syncToServer(headers: object, body: object, pathToApi: string): Promise<import("@project-sunbird/ext-framework-server/services/http-service").IHttpResponse>;
    logTelemetryError(error: any): void;
}
export interface IAdd {
    pathToApi: string;
    requestHeaderObj: {};
    requestBody: {};
}
