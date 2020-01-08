"use strict";
/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
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
const DataBaseSDK_1 = require("./../sdks/DataBaseSDK");
const typescript_ioc_1 = require("typescript-ioc");
const _ = __importStar(require("lodash"));
const SystemSDK_1 = __importDefault(require("./../sdks/SystemSDK"));
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const zlib = __importStar(require("zlib"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const FileSDK_1 = __importDefault(require("./../sdks/FileSDK"));
const uuid = require("uuid");
const telemetryInstance_1 = require("./../services/telemetry/telemetryInstance");
const services_1 = require("@project-sunbird/ext-framework-server/services");
const SettingSDK_1 = __importDefault(require("./../sdks/SettingSDK"));
const networkQueue_1 = require("./../services/queue/networkQueue");
let TelemetrySyncManager = class TelemetrySyncManager {
    constructor() {
        this.settingSDK = new SettingSDK_1.default('openrap-sunbirded-plugin');
        this.TELEMETRY_PACKET_SIZE = parseInt(process.env.TELEMETRY_PACKET_SIZE) || 200;
        this.ARCHIVE_EXPIRY_TIME = 10; // in days
    }
    registerDevice() {
        var interval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            let deviceId = yield this.systemSDK.getDeviceId();
            let deviceSpec = yield this.systemSDK.getDeviceInfo();
            let userDeclaredLocation = yield this.settingSDK.get('location').catch(err => logger_1.logger.error('Error while fetching user Location in registerDevice, error:', err.message));
            if (_.isEmpty(userDeclaredLocation)) {
                return;
            }
            let body = {
                id: process.env.APP_ID,
                ver: process.env.APP_VERSION,
                ts: new Date().toISOString(),
                params: {
                    msgid: uuid.v4()
                },
                request: {
                    channel: process.env.CHANNEL,
                    producer: process.env.APP_ID,
                    dspec: deviceSpec,
                    userDeclaredLocation: {
                        state: _.get(userDeclaredLocation, 'state.name'),
                        district: _.get(userDeclaredLocation, 'city.name')
                    }
                }
            };
            services_1.HTTPService.post(`${process.env.DEVICE_REGISTRY_URL}/${deviceId}`, body, {
                headers: {
                    "Content-Type": "application/json"
                }
            })
                .toPromise()
                .then(data => {
                logger_1.logger.info(`device registred successfully ${data.status}`);
                clearInterval(interval);
            })
                .catch(error => {
                logger_1.logger.error(`Unable to sync device data: ${error.message}`);
            });
        }), 30000);
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
    batchJob() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let did = yield this.systemSDK.getDeviceId();
                let dbFilters = {
                    selector: {},
                    limit: this.TELEMETRY_PACKET_SIZE * 100
                };
                let telemetryEvents = yield this.databaseSdk.find("telemetry", dbFilters);
                if (telemetryEvents.docs.length === 0)
                    return;
                logger_1.logger.info(`Batching telemetry events size ${telemetryEvents.docs.length} of chunk size each ${this.TELEMETRY_PACKET_SIZE}`);
                let updateDIDFlag = process.env.MODE === "standalone";
                let formatedEvents = _.map(telemetryEvents.docs, doc => {
                    let omittedDoc = _.omit(doc, ["_id", "_rev"]);
                    //here we consider all the events as anonymous usage and updating the uid and did if
                    if (updateDIDFlag) {
                        omittedDoc["actor"]["id"] = did;
                        omittedDoc["context"]["did"] = did;
                    }
                    return omittedDoc;
                });
                // create request data for add method in network queue
                let apiKey = yield this.getApiKey();
                if (!apiKey) {
                    logger_1.logger.error("Api key not available");
                    return;
                }
                let headers = {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiKey}`,
                    did: did,
                    msgid: uuid.v4()
                };
                const packets = _.chunk(formatedEvents, this.TELEMETRY_PACKET_SIZE).map(data => ({
                    pathToApi: '/api/data/v1/telemetry',
                    requestHeaderObj: headers,
                    requestBody: Buffer.from(JSON.stringify({ ts: Date.now(), events: data, id: "api.telemetry", ver: "1.0" })),
                }));
                // Inserting to DB
                _.forEach(packets, (packet) => __awaiter(this, void 0, void 0, function* () {
                    yield this.networkQueue.add(packet);
                }));
                logger_1.logger.info(`Adding ${packets.length} packets to queue DB`);
                const deleteEvents = _.map(telemetryEvents.docs, data => ({
                    _id: data._id,
                    _rev: data._rev,
                    _deleted: true
                }));
                telemetryEvents = yield this.databaseSdk.bulkDocs("telemetry", deleteEvents);
                logger_1.logger.info(`Deleted telemetry events of size ${deleteEvents.length} from telemetry db`);
            }
            catch (error) {
                const errorEvent = {
                    context: {
                        env: "telemetryManager"
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
                logger_1.logger.error(`error while batching the telemetry events`, error);
            }
        });
    }
    // Clean up job implementation
    cleanUpJob() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // get the batches from telemetry batch table where sync status is true
                let batches = yield this.networkQueue.get({
                    selector: {
                        syncStatus: true,
                        type: 'NETWORK',
                    }
                });
                for (const batch of batches) {
                    // create gz file with name as batch id with that batch data an store it to telemetry-archive folder
                    // delete the files which are created 10 days back
                    let { requestBody, _id } = batch;
                    let buffer = Buffer.from(requestBody.data);
                    let apiRequestBody = JSON.parse(buffer.toString('utf8'));
                    let data = _.get(apiRequestBody, 'events');
                    let fileSDK = new FileSDK_1.default("");
                    zlib.gzip(JSON.stringify(data), (error, result) => __awaiter(this, void 0, void 0, function* () {
                        if (error) {
                            logger_1.logger.error(`While creating gzip object for telemetry object ${error}`);
                            this.networkQueue.logTelemetryError(error);
                        }
                        else {
                            yield fileSDK.mkdir("telemetry_archived");
                            let filePath = fileSDK.getAbsPath(path.join("telemetry_archived", _id + "." + Date.now() + ".gz"));
                            let wstream = fs.createWriteStream(filePath);
                            wstream.write(result);
                            wstream.end();
                            wstream.on("finish", () => __awaiter(this, void 0, void 0, function* () {
                                logger_1.logger.info(`${data.length} events are wrote to file ${filePath} and  deleting events from telemetry database`);
                                yield this.networkQueue.update(_id, { _deleted: true })
                                    .catch(err => {
                                    logger_1.logger.error("While deleting the telemetry batch events  from database after creating zip", err);
                                });
                            }));
                        }
                    }));
                    const logEvent = {
                        context: {
                            env: "telemetryManager"
                        },
                        edata: {
                            level: "INFO",
                            type: "JOB",
                            message: "Archived the telemetry events to file system",
                            params: [{ packet: batch._id }, { size: data.length }]
                        }
                    };
                    this.telemetryInstance.log(logEvent);
                }
                //delete if the file is archived file is older than 10 days
                let fileSDK = new FileSDK_1.default("");
                let archiveFolderPath = fileSDK.getAbsPath("telemetry_archived");
                fs.readdir(archiveFolderPath, (error, files) => {
                    //filter gz files
                    if (error) {
                        logger_1.logger.error(`While filtering gz files = ${error}`);
                        this.networkQueue.logTelemetryError(error);
                    }
                    else if (files.length !== 0) {
                        let now = Date.now();
                        let expiry = this.ARCHIVE_EXPIRY_TIME * 86400;
                        for (const file of files) {
                            let fileArr = file.split(".");
                            let createdOn = Number(fileArr[fileArr.length - 2]);
                            if ((now - createdOn) / 1000 > expiry) {
                                logger_1.logger.info(`deleting file ${file} which is created on ${createdOn}`);
                                fileSDK.remove(path.join("telemetry_archived", file));
                            }
                        }
                    }
                });
            }
            catch (error) {
                logger_1.logger.error(`while running the telemetry cleanup job ${error}`);
                this.networkQueue.logTelemetryError(error);
            }
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
};
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", networkQueue_1.NetworkQueue)
], TelemetrySyncManager.prototype, "networkQueue", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], TelemetrySyncManager.prototype, "databaseSdk", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", SystemSDK_1.default)
], TelemetrySyncManager.prototype, "systemSDK", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", telemetryInstance_1.TelemetryInstance)
], TelemetrySyncManager.prototype, "telemetryInstance", void 0);
TelemetrySyncManager = __decorate([
    typescript_ioc_1.Singleton
], TelemetrySyncManager);
exports.TelemetrySyncManager = TelemetrySyncManager;
