/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
import { DownloadObject, DownloadFile } from "./../../interfaces";
export declare enum STATUS {
    Submitted = "SUBMITTED",
    InProgress = "INPROGRESS",
    Completed = "COMPLETED",
    Failed = "FAILED",
    Cancelled = "CANCELLED",
    EventEmitted = "EVENTEMITTED"
}
export declare enum STATUS_MESSAGE {
    Submitted = "Request is submitted. It will process soon.",
    InProgress = "Downloading is in progress.",
    Completed = "Downloaded  successfully.",
    Failed = "Download failed."
}
export default class DownloadManager {
    private downloadManagerHelper;
    private telemetryInstance;
    pluginId: string;
    private dbSDK;
    private fileSDK;
    private dataBaseName;
    constructor(pluginId: string);
    download: (files: DownloadFile | DownloadFile[], location: string) => Promise<string>;
    get: (downloadId: string) => Promise<DownloadObject>;
    pause: (downloadId: string) => void;
    cancel: (downloadId: string) => Promise<boolean>;
    pauseAll: () => void;
    cancelAll: () => Promise<boolean>;
    downloadQueue(): any;
    list: (status?: string[]) => Promise<DownloadObject[]>;
    resume(downloadId: string): Promise<void>;
}
export declare const reconciliation: () => Promise<void>;
