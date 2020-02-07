export declare class DownloadSDK {
    private suDScheduler;
    queueDownload(id: any, locations: {
        url: string;
        savePath: string;
    }, observer: any): any;
    pause(id: string, stop?: boolean): boolean;
    cancel(id: string): any;
}
