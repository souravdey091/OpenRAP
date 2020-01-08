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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_ioc_1 = require("typescript-ioc");
const typescript_ioc_2 = require("typescript-ioc");
const DataBaseSDK_1 = require("./../../sdks/DataBaseSDK");
const dbName = 'queue';
let Queue = class Queue {
    constructor() { }
    enQueue(data, docId = '') {
        return this.dbSDK.insertDoc(dbName, data, docId)
            .then(result => result.id)
            .catch(err => { throw this.dbSDK.handleError(err); });
    }
    updateQueue(docId, query) {
        return this.dbSDK.updateDoc(dbName, docId, query);
    }
    deQueue(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.dbSDK.delete(dbName, id);
                return id;
            }
            catch (err) {
                throw this.dbSDK.handleError(err);
            }
        });
    }
    length() {
        return this.dbSDK.list(dbName)
            .then(result => result.rows.length)
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
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [])
], Queue);
exports.Queue = Queue;
