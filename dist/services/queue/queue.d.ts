import { ISystemQueue, INetworkQueue, IQuery, IUpdateQuery } from './IQueue';
export declare enum QUEUE_TYPE {
    System = "SYSTEM",
    Network = "NETWORK"
}
export declare class Queue {
    private dbSDK;
    enQueue(data: ISystemQueue | INetworkQueue, docId?: string): any;
    updateQueue(docId: string, query: IUpdateQuery): Promise<any>;
    deQueue(id: string): Promise<any>;
    length(): any;
    getById(id: string): any;
    getByQuery(query: IQuery): any;
}
export * from './IQueue';
