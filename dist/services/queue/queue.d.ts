import { ISystemQueue, INetworkQueue, INetworkQueueQuery, IUpdateQuery } from './IQueue';
export declare enum QUEUE_TYPE {
    System = "SYSTEM",
    Network = "NETWORK"
}
export declare class Queue {
    private dbSDK;
    protected enQueue(data: ISystemQueue | INetworkQueue, docId?: string): any;
    protected updateQueue(docId: string, query: IUpdateQuery): Promise<any>;
    protected deQueue(id: string): Promise<any>;
    protected length(): any;
    getById(id: string): any;
    getByQuery(query: INetworkQueueQuery): any;
}
export * from './IQueue';
