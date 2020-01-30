export declare class TelemetryExport {
    private databaseSdk;
    private settingSDK;
    private telemetryArchive;
    private cb;
    private destFolder;
    export(destFolder: string, cb: any): Promise<void>;
    private getStream;
    private archiveAppend;
    private getManifestBuffer;
    private streamZip;
    info(cb: any): Promise<void>;
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
