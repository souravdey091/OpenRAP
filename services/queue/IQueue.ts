export interface IQueue {
    _id?: string;
    type: string,
    priority: number;
    createdOn: number;
    updatedOn: number;
    data?: any;
}

export interface ISystemQueue extends IQueue {
    name?: string;
    _rev?: string;
    progress: number;
    group: string;
    plugin: string;
    status: string;
    failedCode?: string;
    isActive: boolean;
    failedReason?: string;
    indexField: string;
    runTime: number;
}
export interface INetworkQueue extends IQueue {
    pathToApi: string;
    requestHeaderObj: object;
    requestBody: any;
    bearerToken: boolean;
    subType: string;
    size?: number;
    count?: number;
}

export interface IQuery {
    selector: {
        type?: string;
        subType?: string;
        status?: string;
    };
    limit?: number;
}

export interface IUpdateQuery {
    updatedOn: number;
}
