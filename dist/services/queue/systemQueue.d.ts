import { Queue } from './queue';
import { IDownloadDocData } from './IQueue';
export declare class SystemQueue extends Queue {
    import(): void;
    delete(): void;
    download(doc: IDownloadDocData, docId: string): Promise<void>;
}
