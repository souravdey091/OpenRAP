export interface DownloadObject {
    id: string;
    status: string;
    createdOn: Date;
    updatedOn: Date;
    stats: {
        totalFiles: number;
        downloadedFiles: number;
        totalSize: number;
        downloadedSize: number;
    };
    files: [{
        id: string;
        file: string;
        source: string;
        path: string;
        size: number;
        downloaded: number;
    }];
}
