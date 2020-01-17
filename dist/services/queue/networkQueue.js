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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const queue_1 = require("./queue");
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const typescript_ioc_1 = require("typescript-ioc");
const services_1 = require("@project-sunbird/ext-framework-server/services");
const telemetryInstance_1 = require("./../telemetry/telemetryInstance");
const _ = __importStar(require("lodash"));
const uuid = require("uuid");
const NetworkSDK_1 = __importDefault(require("./../../sdks/NetworkSDK"));
const EventManager_1 = require("@project-sunbird/ext-framework-server/managers/EventManager");
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
var NETWORK_SUBTYPE;
(function (NETWORK_SUBTYPE) {
    NETWORK_SUBTYPE["Telemetry"] = "TELEMETRY";
})(NETWORK_SUBTYPE = exports.NETWORK_SUBTYPE || (exports.NETWORK_SUBTYPE = {}));
;
var PRIORITY;
(function (PRIORITY) {
    PRIORITY[PRIORITY["first"] = 1] = "first";
})(PRIORITY = exports.PRIORITY || (exports.PRIORITY = {}));
;
const successResponseCode = ['success', 'ok'];
let NetworkQueue = class NetworkQueue extends queue_1.Queue {
    constructor() {
        super(...arguments);
        this.concurrency = 10;
        this.queueList = [];
        this.running = 0;
        this.retryCount = 5;
        this.queueInProgress = false;
    }
    add(doc, docId) {
        let date = Date.now();
        let data = Object.assign({}, doc, { _id: docId || uuid.v4(), createdOn: date, updatedOn: date, type: queue_1.QUEUE_TYPE.Network, priority: PRIORITY.first });
        this.read();
        let resp = this.enQueue(data);
        return resp;
    }
    read() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.running !== 0 || this.queueInProgress) {
                logger_1.logger.warn("Job is in progress");
                return;
            }
            this.queueInProgress = true;
            // If internet is not available return
            let networkStatus = yield this.networkSDK.isInternetAvailable();
            if (!networkStatus) {
                this.queueInProgress = false;
                logger_1.logger.warn("Network syncing failed as internet is not available");
                return;
            }
            try {
                this.queueList = yield this.getByQuery({
                    selector: {
                        type: queue_1.QUEUE_TYPE.Network,
                    },
                    limit: this.concurrency
                });
                // If no data is available to sync return
                if (!this.queueList || this.queueList.length === 0) {
                    this.queueInProgress = false;
                    logger_1.logger.warn("No network queue available to sync");
                    return;
                }
                logger_1.logger.info(`Calling execute method to sync network queue of size = ${this.queueList.length}`);
                this.execute();
                this.queueInProgress = false;
            }
            catch (error) {
                logger_1.logger.error(`DB error while fetching network queue data = ${error}`);
                this.logTelemetryError(error, "DB_ERROR");
            }
        });
    }
    execute() {
        while (this.running < this.concurrency && this.queueList.length) {
            logger_1.logger.info("Went inside while loop");
            const currentQueue = this.queueList.shift();
            let requestBody = _.get(currentQueue, 'requestHeaderObj.Content-Encoding') === 'gzip' ? Buffer.from(currentQueue.requestBody.data) : currentQueue.requestBody;
            this.makeHTTPCall(currentQueue.requestHeaderObj, requestBody, currentQueue.pathToApi)
                .then((resp) => __awaiter(this, void 0, void 0, function* () {
                // For new API if success comes with new responseCode, add responseCode to successResponseCode
                if (_.includes(successResponseCode, _.toLower(_.get(resp, 'data.responseCode')))) {
                    logger_1.logger.info(`Network Queue synced for id = ${currentQueue._id}`);
                    yield this.deQueue(currentQueue._id).catch(error => {
                        logger_1.logger.info(`Received error deleting id = ${currentQueue._id}`);
                    });
                    EventManager_1.EventManager.emit(`${currentQueue.type}_${currentQueue.subType}:processed`, currentQueue);
                    this.running--;
                }
                else {
                    logger_1.logger.warn(`Unable to sync network queue with id = ${currentQueue._id}`);
                    yield this.deQueue(currentQueue._id).catch(error => {
                        logger_1.logger.info(`Received error deleting id = ${currentQueue._id}`);
                    });
                    this.running--;
                }
            }))
                .catch((error) => __awaiter(this, void 0, void 0, function* () {
                logger_1.logger.error(`Error while syncing to Network Queue for id = ${currentQueue._id}`, error.message);
                this.logTelemetryError(error);
                yield this.deQueue(currentQueue._id).catch(error => {
                    logger_1.logger.info(`Received error in catch for deleting id = ${currentQueue._id}`);
                });
                let dbData = {
                    pathToApi: _.get(currentQueue, 'pathToApi'),
                    requestHeaderObj: _.get(currentQueue, 'requestHeaderObj'),
                    requestBody: _.get(currentQueue, 'requestBody'),
                    subType: _.get(currentQueue, 'subType'),
                    size: _.get(currentQueue, 'size'),
                };
                this.running--;
                yield this.add(dbData);
            }));
            this.running++;
        }
    }
    makeHTTPCall(headers, body, pathToApi) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield services_1.HTTPService.post(process.env.APP_BASE_URL + pathToApi, body, { headers: headers }).pipe(operators_1.mergeMap((data) => {
                return rxjs_1.of(data);
            }), operators_1.catchError((error) => {
                if (_.get(error, 'response.status') >= 500 && _.get(error, 'response.status') < 599) {
                    return rxjs_1.throwError(error);
                }
                else {
                    return rxjs_1.of(error);
                }
            }), operators_1.retry(this.retryCount)).toPromise();
        });
    }
    logTelemetryError(error, errType = "SERVER_ERROR") {
        const errorEvent = {
            context: {
                env: "networkQueue"
            },
            edata: {
                err: errType === "DB_ERROR" ? "DB_ERROR" : "SERVER_ERROR",
                errtype: errType === "DB_ERROR" ? "DATABASE" : "SYSTEM",
                stacktrace: (error.stack || error.message || "").toString()
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
