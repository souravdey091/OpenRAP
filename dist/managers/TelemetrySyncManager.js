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
const axios_1 = __importDefault(require("axios"));
const SystemSDK_1 = __importDefault(require("./../sdks/SystemSDK"));
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const api_1 = require("@project-sunbird/ext-framework-server/api");
const GlobalSDK_1 = require("./../sdks/GlobalSDK");
const NetworkSDK_1 = __importDefault(require("./../sdks/NetworkSDK"));
const zlib = __importStar(require("zlib"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const FileSDK_1 = __importDefault(require("./../sdks/FileSDK"));
let TelemetrySyncManager = class TelemetrySyncManager {
    constructor() {
        this.TELEMETRY_PACKET_SIZE = process.env.TELEMETRY_PACKET_SIZE
            ? parseInt(process.env.TELEMETRY_PACKET_SIZE)
            : 200;
    }
    batchJob() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
            }
            catch (error) {
                logger_1.logger.error(`while running the telemetry batch job ${error}`);
            }
            const pluginDetails = yield GlobalSDK_1.list().catch(() => {
                // get the plugins from global registry
                return [];
            });
            if (!pluginDetails.length) {
                return;
            }
            _.forEach(pluginDetails, pluginDetail => {
                this.createTelemetryPacket(pluginDetail.id); // telemetry events by plugin from plugin's  and create the packet
            });
            this.createTelemetryPacket(""); // createTelemetryPacket job for OpenRap telemetry events
        });
    }
    createTelemetryPacket(pluginId) {
        return __awaiter(this, void 0, void 0, function* () {
            let dbFilters = {
                selector: {},
                limit: this.TELEMETRY_PACKET_SIZE * 10
            };
            let telemetryEvents = { docs: [] };
            if (pluginId) {
                let pluginDbInstance = this.frameworkAPI.getPouchDBInstance(pluginId, "telemetry");
                telemetryEvents = yield pluginDbInstance
                    .find(dbFilters)
                    .catch(error => logger_1.logger.error("fetching telemetryEvents failed", error));
                logger_1.logger.info(`telemetry events: , ${telemetryEvents.docs.length} for plugin: ${pluginId}`);
            }
            else {
                telemetryEvents = yield this.databaseSdk
                    .find("telemetry", dbFilters)
                    .catch(error => logger_1.logger.error("fetching telemetryEvents failed", error));
                logger_1.logger.info("telemetry events length", telemetryEvents.docs.length);
            }
            if (!telemetryEvents.docs.length) {
                return;
            }
            let updateDIDFlag = process.env.MODE === "standalone";
            let formatedEvents = _.map(telemetryEvents.docs, doc => {
                let omittedDoc = _.omit(doc, ["_id", "_rev"]);
                //here we consider all the events as anonymous usage and updating the uid and did if
                if (updateDIDFlag) {
                    let did = this.systemSDK.getDeviceId();
                    omittedDoc["actor"]["id"] = did;
                    omittedDoc["context"]["did"] = did;
                }
                return omittedDoc;
            });
            const packets = _.chunk(formatedEvents, this.TELEMETRY_PACKET_SIZE).map(data => ({
                pluginId: pluginId,
                syncStatus: false,
                createdOn: Date.now(),
                updateOn: Date.now(),
                events: data
            }));
            yield this.databaseSdk
                .bulkDocs("telemetry_packets", packets) // insert the batch into batch table with plugin-Id and sync status as false
                .catch(error => logger_1.logger.error("creating packets", error));
            const deleteEvents = _.map(telemetryEvents.docs, data => ({
                _id: data._id,
                _rev: data._rev,
                _deleted: true
            }));
            if (pluginId) {
                let pluginDbInstance = this.frameworkAPI.getPouchDBInstance(pluginId, "telemetry");
                yield pluginDbInstance
                    .bulkDocs(deleteEvents) // clean the events in the plugin telemetry table
                    .catch(error => logger_1.logger.error("deleting telemetry events failed", error));
            }
            else {
                telemetryEvents = yield this.databaseSdk
                    .bulkDocs("telemetry", deleteEvents)
                    .catch(error => logger_1.logger.error("fetching telemetryEvents failed", error));
                logger_1.logger.info("deleted telemetry events length", deleteEvents.length);
            }
            this.createTelemetryPacket(pluginId);
        });
    }
    syncJob() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const networkStatus = yield this.networkSDK
                    .isInternetAvailable()
                    .catch(status => false);
                if (!networkStatus) {
                    // check network connectivity with plugin api base url since we try to sync to that endpoint
                    logger_1.logger.warn("sync job failed: network not available");
                    return;
                }
                let apiKey;
                try {
                    let { api_key } = yield this.databaseSdk.getDoc("settings", "device_token");
                    apiKey = api_key;
                }
                catch (error) {
                    logger_1.logger.warn("device token is not set getting it from api", error);
                    apiKey = yield this.getAPIToken(this.systemSDK.getDeviceId()).catch(err => logger_1.logger.error(`while getting the token ${err}`));
                }
                if (!apiKey) {
                    logger_1.logger.error("sync job failed: api_key not available");
                    return;
                }
                let dbFilters = {
                    selector: {
                        syncStatus: false
                    },
                    limit: 100
                };
                const telemetryPackets = yield this.databaseSdk
                    .find("telemetry_packets", dbFilters) // get the batches from batch table where sync status is false
                    .catch(error => logger_1.logger.error("fetching telemetryPackets failed", error));
                logger_1.logger.info("telemetryPackets length", telemetryPackets.docs.length);
                if (!telemetryPackets.docs.length) {
                    return;
                }
                for (const telemetryPacket of telemetryPackets.docs) {
                    yield this.makeSyncApiCall(telemetryPacket, apiKey)
                        .then(data => {
                        // sync each packet to the plugins  api base url
                        logger_1.logger.info(`${JSON.stringify(data)} telemetry synced for  packet ${telemetryPacket._id} of events ${telemetryPacket.events.length}`); // on successful sync update the batch sync status to true
                        return this.databaseSdk.updateDoc("telemetry_packets", telemetryPacket._id, { syncStatus: true });
                    })
                        .catch(err => {
                        logger_1.logger.error(`error while syncing packets to telemetry service for  packet ${telemetryPacket._id} of events ${telemetryPacket.events.length}`);
                    });
                }
            }
            catch (error) {
                logger_1.logger.error(`while running the telemetry sync job ${error}`);
            }
        });
    }
    makeSyncApiCall(packet, apiKey) {
        return __awaiter(this, void 0, void 0, function* () {
            let headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                did: this.systemSDK.getDeviceId(),
                msgid: packet["_id"]
            };
            let body = {
                ts: Date.now(),
                events: packet.events,
                id: "api.telemetry",
                ver: "1.0"
            };
            return yield axios_1.default.post(process.env.APP_BASE_URL + "/api/data/v1/telemetry", body, { headers: headers });
        });
    }
    // Clean up job implementation
    cleanUpJob() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // get the batches from telemetry batch table where sync status is true
                let { docs: batches = [] } = yield this.databaseSdk.find("telemetry_packets", {
                    selector: {
                        syncStatus: true
                    }
                });
                for (const batch of batches) {
                    // create gz file with name as batch id with that batch data an store it to telemetry-archive folder
                    // delete the files which are created 10 days back
                    let { pluginId, events, _id, _rev } = batch;
                    let fileSDK = new FileSDK_1.default(pluginId);
                    zlib.gzip(JSON.stringify(events), (error, result) => __awaiter(this, void 0, void 0, function* () {
                        if (error) {
                            logger_1.logger.error(`While creating gzip object for telemetry object ${error}`);
                        }
                        else {
                            yield fileSDK.mkdir("telemetry_archived");
                            let filePath = fileSDK.getAbsPath(path.join("telemetry_archived", _id + "." + Date.now() + ".gz"));
                            let wstream = fs.createWriteStream(filePath);
                            wstream.write(result);
                            wstream.end();
                            wstream.on("finish", () => __awaiter(this, void 0, void 0, function* () {
                                logger_1.logger.info(events.length +
                                    " events are wrote to file " +
                                    filePath +
                                    " and  deleting events from telemetry database");
                                yield this.databaseSdk
                                    .bulkDocs("telemetry_packets", [
                                    {
                                        _id: _id,
                                        _rev: _rev,
                                        _deleted: true
                                    }
                                ])
                                    .catch(err => {
                                    logger_1.logger.error("While deleting the telemetry batch events  from database after creating zip", err);
                                });
                            }));
                        }
                    }));
                }
                //TODO: need to delete older archived files
                //delete if the file is archived file is older than 10 days
                // let archiveFolderPath = fileSDK.getAbsPath('telemetry_archived');
                // fs.readdir(archiveFolderPath, (err, files) => {
                //     //filter gz files
                //     let gzfiles =
                // })
            }
            catch (error) {
                logger_1.logger.error(`while running the telemetry cleanup job ${error}`);
            }
        });
    }
    getAPIToken(deviceId = this.systemSDK.getDeviceId()) {
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
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], TelemetrySyncManager.prototype, "databaseSdk", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", api_1.FrameworkAPI)
], TelemetrySyncManager.prototype, "frameworkAPI", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", NetworkSDK_1.default)
], TelemetrySyncManager.prototype, "networkSDK", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", SystemSDK_1.default)
], TelemetrySyncManager.prototype, "systemSDK", void 0);
TelemetrySyncManager = __decorate([
    typescript_ioc_1.Singleton
], TelemetrySyncManager);
exports.TelemetrySyncManager = TelemetrySyncManager;
