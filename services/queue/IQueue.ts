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
    //baseUrl: string;
    syncStatus: boolean;
    pathToApi: string;
    requestHeaderObj: {};
    requestBody: {};
    authHeaderToken: string;
    BearerToken: string;
}

export interface IDownloadDocData {
    pluginId: string;
    status: string;
    statusMsg: string;
    createdOn: number;
    updatedOn: number;
    stats: IDownloadStats;
    files: Array<IDownloadFiles>;
}

export interface IDownloadStats {
    totalFiles: number;
    downloadedFiles: number;
    totalSize: number;
    downloadedSize: number;
}

export interface IDownloadFiles {
    id: string;
    file: string;
    source: string;
    path: string;
    size: number;
    downloaded: number;
}