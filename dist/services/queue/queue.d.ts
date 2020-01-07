import { ISystemQueue, INetworkQueue } from './IQueue';
export declare class Queue {
    private dbSDK;
    constructor();
    protected enQueue(data: ISystemQueue | INetworkQueue, docId?: string): any;
    protected updateQueue(docId: string, query: object): Promise<any>;
    protected deQueue(id: string): Promise<string>;
    protected length(): any;
    protected getById(id: string): any;
    protected getByType(type: string): any;
    protected getByQuery(query: any): any;
}
export * from './IQueue';
