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
const logger_1 = require("@project-sunbird/logger");
const typescript_ioc_1 = require("typescript-ioc");
const services_1 = require("@project-sunbird/ext-framework-server/services");
const telemetryInstance_1 = require("./../telemetry/telemetryInstance");
const _ = __importStar(require("lodash"));
const uuid = require("uuid");
const NetworkSDK_1 = __importDefault(require("./../../sdks/NetworkSDK"));
const EventManager_1 = require("@project-sunbird/ext-framework-server/managers/EventManager");
const operators_1 = require("rxjs/operators");
const rxjs_1 = require("rxjs");
const SystemSDK_1 = __importDefault(require("../../sdks/SystemSDK"));
const DataBaseSDK_1 = require("../../sdks/DataBaseSDK");
const SettingSDK_1 = __importDefault(require("../../sdks/SettingSDK"));
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
        this.concurrency = 6;
        this.queueList = [];
        this.running = 0;
        this.retryCount = 5;
        this.queueInProgress = false;
    }
    setSubType() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const dbData = yield this.settingSDK.get('networkQueueInfo');
                this.excludeSubType = _.map(_.filter(dbData.config, { sync: false }), 'type');
            }
            catch (error) {
                this.excludeSubType = [];
            }
        });
    }
    add(doc, docId) {
        return __awaiter(this, void 0, void 0, function* () {
            let date = Date.now();
            let data = Object.assign({}, doc, { _id: docId || uuid.v4(), createdOn: date, updatedOn: date, type: queue_1.QUEUE_TYPE.Network, priority: PRIORITY.first });
            let resp = yield this.enQueue(data);
            this.start();
            return resp;
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            EventManager_1.EventManager.subscribe("networkQueueInfo", (data) => __awaiter(this, void 0, void 0, function* () {
                yield this.setSubType();
            }));
            this.apiKey = this.apiKey || (yield this.getApiKey());
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
                let query = {
                    selector: {
                        type: queue_1.QUEUE_TYPE.Network,
                        subType: {}
                    },
                    limit: this.concurrency
                };
                if (!_.isEmpty(this.excludeSubType)) {
                    query.selector['subType']['$nin'] = this.excludeSubType;
                }
                this.queueList = yield this.getByQuery(query);
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
            logger_1.logger.info(`While loop in progress - ${this.running}`);
            const currentQueue = this.queueList.shift();
            currentQueue.requestHeaderObj['Authorization'] = currentQueue.bearerToken ? `Bearer ${this.apiKey}` : '';
            let requestBody = _.get(currentQueue, 'requestHeaderObj.Content-Encoding') === 'gzip' ? Buffer.from(currentQueue.requestBody.data) : currentQueue.requestBody;
            this.makeHTTPCall(currentQueue.requestHeaderObj, requestBody, currentQueue.pathToApi)
                .then((resp) => __awaiter(this, void 0, void 0, function* () {
                // For new API if success comes with new responseCode, add responseCode to successResponseCode
                if (_.includes(successResponseCode, _.toLower(_.get(resp, 'data.responseCode')))) {
                    logger_1.logger.info(`Network Queue synced for id = ${currentQueue._id}`);
                    yield this.deQueue(currentQueue._id).catch(error => {
                        logger_1.logger.info(`Received error deleting id = ${currentQueue._id}`);
                    });
                    EventManager_1.EventManager.emit(`${_.toLower(currentQueue.subType)}-synced`, currentQueue);
                    this.start();
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
                    bearerToken: _.get(currentQueue, 'bearerToken'),
                };
                this.running--;
                yield this.add(dbData, currentQueue._id);
            }));
            this.running++;
        }
    }
    makeHTTPCall(headers, body, pathToApi) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield services_1.HTTPService.post(pathToApi, body, { headers: headers }).pipe(operators_1.mergeMap((data) => {
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
    getApiKey() {
        return __awaiter(this, void 0, void 0, function* () {
            let did = yield this.systemSDK.getDeviceId();
            let apiKey;
            try {
                let { api_key } = yield this.databaseSdk.getDoc("settings", "device_token");
                apiKey = api_key;
            }
            catch (error) {
                logger_1.logger.warn("device token is not set getting it from api", error);
                apiKey = yield this.getAPIToken(did).catch(err => logger_1.logger.error(`while getting the token ${err}`));
            }
            return apiKey;
        });
    }
    getAPIToken(deviceId) {
        return __awaiter(this, void 0, void 0, function* () {
            //const apiKey =;
            //let token = Buffer.from(apiKey, 'base64').toString('ascii');
            // if (process.env.APP_BASE_URL_TOKEN && deviceId) {
            //   let headers = {
            //     "Content-Type": "application/json",
            //     Authorization: `Bearer ${process.env.APP_BASE_URL_TOKEN}`
            //   };
            //   let body = {
            //     id: "api.device.register",
            //     ver: "1.0",
            //     ts: Date.now(),
            //     request: {
            //       key: deviceId
            //     }
            //   };
            //   let response = await axios
            //     .post(
            //       process.env.APP_BASE_URL +
            //         "/api/api-manager/v1/consumer/mobile_device/credential/register",
            //       body,
            //       { headers: headers }
            //     )
            //     .catch(err => {
            //       logger.error(
            //         `Error while registering the device status ${
            //           err.response.status
            //         } data ${err.response.data}`
            //       );
            //       throw Error(err);
            //     });
            //   let key = _.get(response, "data.result.key");
            //   let secret = _.get(response, "data.result.secret");
            //   let apiKey = jwt.sign({ iss: key }, secret, { algorithm: "HS256" });
            //   await this.databaseSdk
            //     .upsertDoc("settings", "device_token", { api_key: apiKey })
            //     .catch(err => {
            //       logger.error("while inserting the api key to the  database", err);
            //     });
            return Promise.resolve(process.env.APP_BASE_URL_TOKEN);
            // } else {
            //   throw Error(`token or deviceID missing to register device ${deviceId}`);
            // }
        });
    }
    forceSync(subType) {
        return __awaiter(this, void 0, void 0, function* () {
            this.apiKey = this.apiKey || (yield this.getApiKey());
            let query = {
                selector: {
                    subType: { $in: subType }
                },
                limit: this.concurrency
            };
            const dbData = yield this.getByQuery(query);
            if (!dbData || dbData.length === 0) {
                return 'All data is synced';
            }
            const resp = yield this.executeForceSync(dbData, subType);
            if (resp) {
                throw {
                    code: _.get(resp, 'response.statusText'),
                    status: _.get(resp, 'response.status'),
                    message: _.get(resp, 'response.data.message')
                };
            }
        });
    }
    executeForceSync(dbData, subType) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const currentQueue of dbData) {
                currentQueue.requestHeaderObj['Authorization'] = currentQueue.bearerToken ? `Bearer ${this.apiKey}` : '';
                let requestBody = _.get(currentQueue, 'requestHeaderObj.Content-Encoding') === 'gzip' ? Buffer.from(currentQueue.requestBody.data) : currentQueue.requestBody;
                try {
                    let resp = yield this.makeHTTPCall(currentQueue.requestHeaderObj, requestBody, currentQueue.pathToApi);
                    if (_.includes(successResponseCode, _.toLower(_.get(resp, 'data.responseCode')))) {
                        logger_1.logger.info(`Network Queue synced for id = ${currentQueue._id}`);
                        yield this.deQueue(currentQueue._id);
                        EventManager_1.EventManager.emit(`${_.toLower(currentQueue.subType)}-synced`, currentQueue);
                    }
                    else {
                        logger_1.logger.warn(`Unable to sync network queue with id = ${currentQueue._id}`);
                        return resp;
                    }
                }
                catch (error) {
                    logger_1.logger.error(`Error while syncing to Network Queue for id = ${currentQueue._id}`, error.message);
                    this.logTelemetryError(error);
                    return error;
                }
            }
            yield this.forceSync(subType);
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
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", SystemSDK_1.default)
], NetworkQueue.prototype, "systemSDK", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], NetworkQueue.prototype, "databaseSdk", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", SettingSDK_1.default)
], NetworkQueue.prototype, "settingSDK", void 0);
NetworkQueue = __decorate([
    typescript_ioc_1.Singleton
], NetworkQueue);
exports.NetworkQueue = NetworkQueue;
