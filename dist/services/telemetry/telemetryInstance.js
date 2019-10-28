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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_ioc_1 = require("typescript-ioc");
const telemetryService_1 = require("./telemetryService");
const DataBaseSDK_1 = require("./../../sdks/DataBaseSDK");
const _ = __importStar(require("lodash"));
const uuid = require("uuid");
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
let TelemetryInstance = class TelemetryInstance extends telemetryService_1.TelemetryService {
    constructor() {
        super();
        this.sessionId = uuid.v4();
        this.telemetryEvents = [];
        let telemetryValidation = _.toLower(process.env.TELEMETRY_VALIDATION) === "true" ? true : false;
        let config = {
            pdata: {
                id: process.env.APP_ID,
                ver: process.env.APP_VERSION,
                pid: "desktop.app"
            },
            sid: this.sessionId,
            env: "container",
            rootOrgId: process.env.ROOT_ORG_ID,
            hashTagId: process.env.ROOT_ORG_HASH_TAG_ID,
            batchSize: 1,
            enableValidation: telemetryValidation,
            runningEnv: "server",
            dispatcher: this.send.bind(this)
        };
        this.init(config);
        this.syncToDB();
    }
    send(events) {
        if (!_.isArray(events))
            events = [events];
        this.telemetryEvents.push(...events);
        return Promise.resolve();
    }
    syncToDB() {
        setInterval(() => {
            if (this.telemetryEvents.length > 0) {
                let events = this.telemetryEvents.splice(0);
                this.databaseSdk.bulkDocs("telemetry", events).catch(err => {
                    this.telemetryEvents.push(...events);
                    logger_1.logger.error(`While syncing ${events.length} events from in memory to database`, err);
                });
            }
        }, 5000);
    }
};
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], TelemetryInstance.prototype, "databaseSdk", void 0);
TelemetryInstance = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [])
], TelemetryInstance);
exports.TelemetryInstance = TelemetryInstance;
