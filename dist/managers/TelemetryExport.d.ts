export declare class TelemetryExport {
    private destFolder?;
    private databaseSdk;
    private settingSDK;
    private telemetryArchive;
    private cb;
    constructor(destFolder?: string);
    export(cb: any): Promise<void>;
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
