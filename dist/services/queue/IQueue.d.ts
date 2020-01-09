export interface IQueue {
    _id?: string;
    type: string;
    priority: number;
    createdOn: number;
    updatedOn: number;
    data?: any;
}
export interface ISystemQueue extends IQueue {
    size: number;
    artifactUrl?: string;
    fileName?: string;
    status: string;
    progress: number;
}
export interface INetworkQueue extends IQueue {
    syncStatus: boolean;
    pathToApi: string;
    requestHeaderObj: object;
    requestBody: Buffer;
    subType: string;
}
