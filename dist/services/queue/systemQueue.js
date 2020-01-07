"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("./queue");
const type = {
    download: 'DOWNLOAD',
    import: 'IMPORT',
    delete: 'DELETE',
};
class SystemQueue extends queue_1.Queue {
    // constructor(){
    //     super();
    // }
    import() {
    }
    delete() {
    }
    download(doc, docId) {
        return __awaiter(this, void 0, void 0, function* () {
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
            let a = yield this.enQueue(reqData);
            console.log('data===================================================', a);
            console.log('docId===================================================', docId);
        });
    }
}
exports.SystemQueue = SystemQueue;
