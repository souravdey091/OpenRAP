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
const _ = __importStar(require("lodash"));
const telemetry_helper_1 = require("./telemetry-helper");
const typescript_ioc_1 = require("typescript-ioc");
let TelemetryService = class TelemetryService extends telemetry_helper_1.TelemetryHelper {
    constructor() {
        super();
        this.telemetryBatch = [];
        this.telemetryConfig = {};
    }
    init(config) {
        // const orgDetails = await this.databaseSdk.getDoc(
        //   "organization",
        //   process.env.CHANNEL
        // );
        // get mode from process env if standalone use machine id as did for client telemetry also
        this.telemetryConfig = config;
        const telemetryLibConfig = {
            userOrgDetails: {
                userId: "anonymous",
                rootOrgId: config.rootOrgId,
                organisationIds: [config.hashTagId]
            },
            config: {
                pdata: config.pdata,
                batchsize: config.batchSize,
                endpoint: "",
                apislug: "",
                sid: config.sid,
                channel: config.hashTagId,
                env: config.env,
                enableValidation: config.enableValidation,
                timeDiff: 0,
                runningEnv: config.runningEnv || "server",
                dispatcher: {
                    dispatch: this.dispatcher.bind(this)
                }
            }
        };
        super.init(telemetryLibConfig);
    }
    dispatcher(data) {
        this.telemetryConfig.dispatcher(_.cloneDeep([data]));
    }
};
TelemetryService = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [])
], TelemetryService);
exports.TelemetryService = TelemetryService;
