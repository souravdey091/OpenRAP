import { Queue, INetworkQueue } from './queue';

export class NetworkQueue extends Queue {
    // constructor(){
    //     super();
    // }
    
    public async add(doc: INetworkQueue, docId?: string) {
        return await this.enQueue(doc, docId);
    }
    
    public async update(docId: string, query: object) {
        return await this.updateQueue(docId, query);
    }

    // public async addBulk(doc: Array<any>) {
    //     return await this.enQueueBulk(doc);
    // }

    public async get(query: object) {
        return await this.getByQuery(query);
    }
}