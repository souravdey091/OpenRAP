import { Singleton } from "typescript-ioc";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import { DataBaseSDK } from "./../../sdks/DataBaseSDK";
import { ISystemQueue, INetworkQueue } from './IQueue';
const dbName = 'queue';

@Singleton
export class Queue {

    @Inject
    private dbSDK: DataBaseSDK;

    constructor() { }

    protected enQueue(data: ISystemQueue | INetworkQueue, docId: string = '') {
        return this.dbSDK.insertDoc(dbName, data, docId)
            .then(result => result.id)
            .catch(err => { throw this.dbSDK.handleError(err); });
    }

    protected updateQueue(docId: string, query: object) {
        return this.dbSDK.updateDoc(dbName, docId, query);
    }

    protected async deQueue(id: string) {
        try {
            await this.dbSDK.delete(dbName, id);
            return id;
        }
        catch (err) {
            throw this.dbSDK.handleError(err);
        }
    }

    protected length() {
        return this.dbSDK.list(dbName)
            .then(result => result.rows.length)
            .catch(err => { throw this.dbSDK.handleError(err); });
    }

    protected getById(id: string) {
        return this.dbSDK.getDoc(dbName, id)
            .then(result => result.docs)
            .catch(err => { throw this.dbSDK.handleError(err); });
    }

    protected getByQuery(query: any) {
        return this.dbSDK.find(dbName, query)
            .then(result => result.docs)
            .catch(err => { throw this.dbSDK.handleError(err); });
    }
}

export * from './IQueue';
