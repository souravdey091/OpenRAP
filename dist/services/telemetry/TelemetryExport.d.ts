export declare class TelemetryExport {
    private databaseSdk;
    private settingSDK;
    private systemSDK;
    private telemetryHelper;
    private telemetryArchive;
    private cb;
    private destFolder;
    private telemetryShareItems;
    private deviceId;
    constructor();
    private setDeviceID;
    export(destFolder: string, cb: any): Promise<void>;
    private getStream;
    private archiveAppend;
    private getManifestBuffer;
    private streamZip;
    info(cb: any): Promise<void>;
    private generateShareEvent;
}
export interface IItems {
    objectType: string;
    file: string;
    contentEncoding: string;
    size: number;
    explodedSize: number;
    mid: string;
    eventsCount: number;
}
export interface IShareItems {
    id: string;
    type: string;
    params: [{
        count: string;
    }, {
        size: string;
    }];
    origin: {
        id: string;
        type: string;
    };
}
