import { Readable } from 'stream';
export declare class TelemetryExport {
    private destFolder;
    private databaseSdk;
    private telemetryArchive;
    private cb;
    constructor(destFolder: any);
    getStream(id: any): Readable;
    private archiveAppend;
    private getRootManifestBuffer;
    private getTelemetryManifestBuffer;
    private streamZip;
    export(cb: any): Promise<void>;
}
