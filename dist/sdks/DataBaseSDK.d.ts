export declare class DataBaseSDK {
    dbPath: string;
    dbInstances: object;
    constructor();
    private getDBInstance;
    createDB(database: string): any;
    createIndex(database: string, indexDef: any): any;
    insertDoc(database: string, doc: any, Id?: string): any;
    upsertDoc(database: string, docId: string, doc: any): Promise<any>;
    getDoc(database: string, Id: string): any;
    updateDoc(database: string, Id: string, document: any): Promise<any>;
    bulkDocs(database: string, documents: Object[]): any;
    find(database: string, searchObj: Object): any;
    handleError(error: PouchDBErrorRes): DBError;
}
export interface PouchDBErrorRes {
    'status': number;
    'name': string;
    'message': string;
    'error': boolean;
    'reason': string;
    'docId': string;
}
export interface DBError {
    code: string;
    status: number;
    message: string;
}
