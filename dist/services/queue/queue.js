"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_ioc_1 = require("typescript-ioc");
const _ = __importStar(require("lodash"));
const typescript_ioc_2 = require("typescript-ioc");
const DataBaseSDK_1 = require("./../../sdks/DataBaseSDK");
const dbName = 'queue';
var QUEUE_TYPE;
(function (QUEUE_TYPE) {
    QUEUE_TYPE["System"] = "SYSTEM";
    QUEUE_TYPE["Network"] = "NETWORK";
})(QUEUE_TYPE = exports.QUEUE_TYPE || (exports.QUEUE_TYPE = {}));
;
let Queue = class Queue {
    enQueue(data, docId = '') {
        return this.dbSDK.insertDoc(dbName, data, docId)
            .then(result => result.id)
            .catch(err => { throw this.dbSDK.handleError(err); });
    }
    updateQueue(docId, query) {
        return this.dbSDK.updateDoc(dbName, docId, query);
    }
    deQueue(id) {
        return this.dbSDK.delete(dbName, id);
    }
    length() {
        return this.dbSDK.list(dbName)
            .then(result => _.get(result, 'rows.length'))
            .catch(err => { throw this.dbSDK.handleError(err); });
    }
    getById(id) {
        return this.dbSDK.getDoc(dbName, id)
            .then(result => result.docs)
            .catch(err => { throw this.dbSDK.handleError(err); });
    }
    getByQuery(query) {
        return this.dbSDK.find(dbName, query)
            .then(result => result.docs)
            .catch(err => { throw this.dbSDK.handleError(err); });
    }
};
__decorate([
    typescript_ioc_2.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], Queue.prototype, "dbSDK", void 0);
Queue = __decorate([
    typescript_ioc_1.Singleton
], Queue);
exports.Queue = Queue;
__export(require("./IQueue"));
