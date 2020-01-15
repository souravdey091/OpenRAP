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
const maxRunningJobs = 1;
let NetworkQueue = class NetworkQueue extends queue_1.Queue {
    constructor() {
        super(...arguments);
        this.runningJobs = [];
    }
    init() {
        EventManager_1.EventManager.subscribe("network:available", () => {
            this.execute();
        });
    }
    add(doc, docId) {
        let date = Date.now();
        let data = Object.assign({}, doc, { _id: docId || uuid.v4(), createdOn: date, updatedOn: date, type: queue_1.QUEUE_TYPE.Network, priority: PRIORITY.first, syncStatus: false });
        let resp = this.enQueue(data);
        this.execute();
        return resp;
    }
    execute() {
        return __awaiter(this, void 0, void 0, function* () {
            // If internet is not available return
            let networkStatus = yield this.networkSDK.isInternetAvailable();
            if (!networkStatus) {
                logger_1.logger.warn("Network syncing failed as internet is not available");
                return;
            }
            try {
                let queueData = yield this.getByQuery({
                    selector: {
                        syncStatus: false,
                        type: queue_1.QUEUE_TYPE.Network,
                    },
                    limit: maxRunningJobs
                });
                // If no data is available to sync return
                if (!queueData || queueData.length === 0) {
                    return;
                }
                logger_1.logger.info("Syncing network queue of size", queueData.length);
                let queuedJobIndex = 0;
                while (maxRunningJobs > this.runningJobs.length && queueData[queuedJobIndex]) {
                    logger_1.logger.info("Went inside while loop");
                    let currentQueue = queueData[queuedJobIndex];
                    const jobRunning = _.find(this.runningJobs, { id: currentQueue._id }); // duplicate check
                    if (!jobRunning) {
                        this.runningJobs.push({
                            _id: currentQueue._id
                        });
                        let requestBody = Buffer.from(currentQueue.requestBody.data);
                        this.makeHTTPCall(currentQueue.requestHeaderObj, requestBody, currentQueue.pathToApi)
                            .then((data) => __awaiter(this, void 0, void 0, function* () {
                            logger_1.logger.info(`Network Queue synced for id = ${currentQueue._id}`);
                            yield this.updateQueue(currentQueue._id, { syncStatus: true, updatedOn: Date.now() });
                            _.remove(this.runningJobs, (job) => job._id === currentQueue._id);
                            this.execute();
                        }))
                            .catch(error => {
                            _.remove(this.runningJobs, (job) => job._id === currentQueue._id);
                            logger_1.logger.error(`Error while syncing to Network Queue for id = ${currentQueue._id}`, error.message);
                            this.logTelemetryError(error);
                        });
                    }
                    queuedJobIndex++;
                }
            }
            catch (error) {
                logger_1.logger.error(`while running the Network queue sync job`, error);
                this.logTelemetryError(error);
            }
        });
    }
    makeHTTPCall(headers, body, pathToApi) {
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
