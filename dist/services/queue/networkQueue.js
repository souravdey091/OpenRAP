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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("./queue");
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const typescript_ioc_1 = require("typescript-ioc");
const services_1 = require("@project-sunbird/ext-framework-server/services");
const telemetryInstance_1 = require("./../telemetry/telemetryInstance");
const uuid = require("uuid");
const NetworkSDK_1 = __importDefault(require("./../../sdks/NetworkSDK"));
let NetworkQueue = class NetworkQueue extends queue_1.Queue {
    // constructor(){
    //     super();
    // }
    add(doc) {
        let data = Object.assign({}, doc, { _id: uuid.v4(), createdOn: Date.now(), updatedOn: Date.now(), type: 'NETWORK', priority: 1, syncStatus: false });
        return this.enQueue(data);
    }
    update(docId, query) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.updateQueue(docId, query);
        });
    }
    get(query) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.getByQuery(query);
        });
    }
    executeQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let queueData = yield this.get({
                    selector: {
                        syncStatus: false,
                        type: 'NETWORK',
                    },
                    limit: 100
                });
                let networkStatus = yield this.networkSDK.isInternetAvailable();
                if (!queueData || queueData.length === 0 || networkStatus === false) {
                    return;
                }
                logger_1.logger.info("Syncing network queue of size", queueData.length);
                for (const doc of queueData) {
                    yield this.syncToServer(doc.requestBody, doc.requestHeaderObj, doc.pathToApi)
                        .then(data => {
                        logger_1.logger.info(`Network Queue synced for id = ${doc._id}`);
                        return this.update(doc._id, { syncStatus: true });
                    })
                        .catch(error => {
                        logger_1.logger.error(`Error while syncing to Network Queue for id = ${doc._id}`, error.message);
                        this.logTelemetryError(error);
                    });
                }
            }
            catch (error) {
                logger_1.logger.error(`while running the Network queue sync job`, error);
                this.logTelemetryError(error);
            }
        });
    }
    syncToServer(headers, body, pathToApi) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield services_1.HTTPService.post(process.env.APP_BASE_URL + pathToApi, body, { headers: headers }).toPromise();
        });
    }
    logTelemetryError(error) {
        const errorEvent = {
            context: {
                env: "networkQueue"
            },
            edata: {
                err: "SERVER_ERROR",
                errtype: "SYSTEM",
                stacktrace: (error.stack ||
                    error.stacktrace ||
                    error.message ||
                    "").toString()
            }
        };
        this.telemetryInstance.error(errorEvent);
    }
};
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", NetworkSDK_1.default)
], NetworkQueue.prototype, "networkSDK", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", telemetryInstance_1.TelemetryInstance)
], NetworkQueue.prototype, "telemetryInstance", void 0);
NetworkQueue = __decorate([
    typescript_ioc_1.Singleton
], NetworkQueue);
exports.NetworkQueue = NetworkQueue;
