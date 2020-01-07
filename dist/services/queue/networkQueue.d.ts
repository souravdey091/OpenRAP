import { Queue, INetworkQueue } from './queue';
export declare class NetworkQueue extends Queue {
    add(doc: INetworkQueue, docId?: string): Promise<any>;
    update(docId: string, query: object): Promise<any>;
    get(query: object): Promise<any>;
}
