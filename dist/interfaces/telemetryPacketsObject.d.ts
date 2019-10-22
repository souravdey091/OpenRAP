export interface TelemetryPacketsObject {
    id: string;
    pluginId: string;
    status: string;
    statusMsg: string;
    createdOn: Date;
    updatedOn: Date;
    size: number;
    events: Array<any>;
}
