export interface IQueue {
    _id?: string;
    type: string,
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
    requestBody: any;
    subType: string;
    size?: number;
}

export interface IQuery {
    selector: {
        syncStatus?: boolean;
        type: string;
        subType?: string;
    };
    limit?: number;
}

export interface IUpdateQuery {
    syncStatus?: boolean;
    updatedOn: number;
}
