import { Queue } from './queue';
import { IDownloadDocData } from './IQueue';
const type = {
    download: 'DOWNLOAD',
    import: 'IMPORT',
    delete: 'DELETE',
}


export class SystemQueue extends Queue {
    // constructor(){
    //     super();
    // }
    public import() {

    }
    public delete() {

    }
    public async download(doc: IDownloadDocData, docId: string) {
        let reqData = {
            id: docId,
            type: type.download,
            priority: 1,
            createdOn: doc.createdOn,
            updatedOn: doc.updatedOn,
            data: doc,
            size: doc.stats.totalSize,
            status: doc.status,
            progress: doc.stats.downloadedSize,
        };
        let a = await this.enQueue(reqData);



        console.log('data===================================================', a)
        console.log('docId===================================================', docId)

    }
}