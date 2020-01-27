import { Readable } from 'stream';
export declare class TelemetryExport {
    private destFolder;
    private databaseSdk;
    private telemetryArchive;
    private cb;
    constructor(destFolder: any);
    getStream(id: any): Readable;
    private archiveAppend;
    private getManifestBuffer;
    private streamZip;
    export(cb: any): Promise<void>;
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
