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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
const typescript_ioc_1 = require("typescript-ioc");
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-find'));
const path = __importStar(require("path"));
let DataBaseSDK = class DataBaseSDK {
    constructor() {
        this.dbPath = process.env.DATABASE_PATH;
        this.dbInstances = {};
    }
    getDBInstance(database) {
        if (!this.dbInstances[database]) {
            this.dbInstances[database] = new PouchDB(path.join(this.dbPath, database));
        }
        return this.dbInstances[database];
    }
    createDB(database) {
        this.dbInstances[database] = new PouchDB(path.join(this.dbPath, database));
        return this.dbInstances[database];
    }
    createIndex(database, indexDef) {
        return this.getDBInstance(database).createIndex(indexDef);
    }
    insertDoc(database, doc, Id) {
        if (Id) {
            doc._id = Id;
            return this.getDBInstance(database).put(doc);
        }
        return this.getDBInstance(database).post(doc);
    }
    upsertDoc(database, docId, doc) {
        return __awaiter(this, void 0, void 0, function* () {
            let db = this.getDBInstance(database);
            let docNotFound = false;
            let docResponse = yield db.get(docId).catch(err => {
                if (err.status === 404) {
                    docNotFound = true;
                }
                else {
                    // if error is not doc not found then throwing error 
                    throw Error(err);
                }
            });
            let result;
            if (docNotFound) {
                doc._id = docId;
                result = yield db.put(doc);
            }
            else {
                doc._id = docResponse['_id'];
                doc._rev = docResponse['_rev'];
                result = yield db.put(doc);
            }
            return result;
        });
    }
    getDoc(database, Id) {
        return this.getDBInstance(database).get(Id);
    }
    updateDoc(database, Id, document) {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = yield this.getDBInstance(database).get(Id);
            let updatedDoc = Object.assign({}, doc, document);
            return this.getDBInstance(database).put(updatedDoc);
        });
    }
    bulkDocs(database, documents) {
        return this.getDBInstance(database).bulkDocs(documents);
    }
    find(database, searchObj) {
        return this.getDBInstance(database).find(searchObj);
    }
    list(database, options = {}) {
        return this.getDBInstance(database).allDocs(options);
    }
    delete(database, Id) {
        return __awaiter(this, void 0, void 0, function* () {
            let doc = yield this.getDBInstance(database).get(Id);
            return this.getDBInstance(database).remove(doc);
        });
    }
    handleError(error) {
        if (error.status === 404 && error.name === 'not_found') {
            return {
                code: "DOC_NOT_FOUND",
                status: error.status,
                message: `Document not found with id ${error.docId}`
            };
        }
        else if (error.status === 409 && error.name === 'conflict') {
            return {
                code: "UPDATE_CONFLICT",
                status: error.status,
                message: `Document already exist with id ${error.docId}`
            };
        }
        else {
            return {
                code: error.name,
                status: error.status,
                message: error.message
            };
        }
    }
};
DataBaseSDK = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [])
], DataBaseSDK);
exports.DataBaseSDK = DataBaseSDK;
