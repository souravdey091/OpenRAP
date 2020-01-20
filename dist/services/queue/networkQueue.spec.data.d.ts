declare const queueListData: {
    pathToApi: string;
    requestHeaderObj: {
        'Content-Type': string;
        'Content-Encoding': string;
        Authorization: string;
    };
    requestBody: {
        type: string;
        data: number[];
    };
    subType: string;
    size: number;
    createdOn: number;
    updatedOn: number;
    type: string;
    priority: number;
    _id: string;
    _rev: string;
}[];
declare const errorEvent: {
    context: {
        env: string;
    };
    edata: {
        err: string;
        errtype: string;
        stacktrace: string;
    };
};
export { queueListData, errorEvent };
