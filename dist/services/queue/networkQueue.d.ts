import { Queue } from './queue';
import NetworkSDK from "./../../sdks/NetworkSDK";
export declare enum NETWORK_SUBTYPE {
    Telemetry = "TELEMETRY"
}
export declare enum PRIORITY {
    first = 1
}
export declare class NetworkQueue extends Queue {
    networkSDK: NetworkSDK;
    private telemetryInstance;
    private runningJobs;
    init(): void;
    add(doc: IAdd, docId?: string): any;
    execute(): Promise<void>;
    makeHTTPCall(headers: object, body: object, pathToApi: string): Promise<import("@project-sunbird/ext-framework-server/services/http-service").IHttpResponse>;
    logTelemetryError(error: any): void;
}
export interface IAdd {
    subType: string;
    pathToApi: string;
    requestHeaderObj: object;
    requestBody: Buffer;
}
