export declare class DownloadManagerHelper {
    private dbSDK;
    private telemetryInstance;
    private dataBaseName;
    private suDScheduler;
    constructor();
    queueDownload: (downloadId: string, pluginId: string, locations: object, observer: any) => boolean;
    pause: (downloadId: string, stop?: boolean) => boolean;
    cancel: (downloadId: string) => boolean;
    pauseAll: (stop?: boolean) => void;
    cancelAll: () => boolean;
    taskQueue: () => any;
    resumeDownload: () => void;
    downloadObserver: (downloadId: string, docId: string) => {
        next: (progressInfo: any) => void;
        error: (error: any) => void;
        complete: () => void;
    };
}
