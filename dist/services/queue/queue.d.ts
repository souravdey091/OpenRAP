import { ISystemQueue, INetworkQueue, IQuery } from './IQueue';
export declare enum QUEUE_TYPE {
    System = "SYSTEM",
    Network = "NETWORK"
}
export declare class Queue {
    private dbSDK;
    constructor();
    protected enQueue(data: ISystemQueue | INetworkQueue, docId?: string): any;
    protected updateQueue(docId: string, query: object): Promise<any>;
    protected deQueue(id: string): Promise<string>;
    protected length(): any;
    protected getById(id: string): any;
    protected getByQuery(query: IQuery): any;
}
export * from './IQueue';
