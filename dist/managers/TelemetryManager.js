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
const DataBaseSDK_1 = require("../sdks/DataBaseSDK");
const typescript_ioc_1 = require("typescript-ioc");
const _ = __importStar(require("lodash"));
const SystemSDK_1 = __importDefault(require("../sdks/SystemSDK"));
const logger_1 = require("@project-sunbird/logger");
const zlib = __importStar(require("zlib"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const FileSDK_1 = __importDefault(require("../sdks/FileSDK"));
const uuid = require("uuid");
const telemetryInstance_1 = require("../services/telemetry/telemetryInstance");
const services_1 = require("@project-sunbird/ext-framework-server/services");
const SettingSDK_1 = __importDefault(require("../sdks/SettingSDK"));
const networkQueue_1 = require("../services/queue/networkQueue");
const EventManager_1 = require("@project-sunbird/ext-framework-server/managers/EventManager");
let TelemetryManager = class TelemetryManager {
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
    migrateTelemetryPacketToQueueDB() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                let telemetryPackets = yield this.databaseSdk.list("telemetry_packets", { include_docs: true });
                telemetryPackets = _.filter(telemetryPackets.rows, (o) => { return !o.doc.syncStatus; });
                if (!telemetryPackets || telemetryPackets.length === 0) {
                    return;
                }
                for (const telemetryPacket of telemetryPackets) {
                    const packet = telemetryPacket.doc;
                    let did = yield this.systemSDK.getDeviceId();
                    let headers = {
                        "Content-Type": "application/json",
                        did: did,
                        msgid: _.get(packet, '_id')
                    };
                    const zipData = JSON.stringify({ ts: Date.now(), events: _.get(packet, 'events'), id: "api.telemetry", ver: "1.0" });
                    zlib.gzip(zipData, (error, result) => __awaiter(this, void 0, void 0, function* () {
                        if (error) {
                            throw Error(JSON.stringify(error));
                        }
                        else {
                            let dbData = {
                                pathToApi: `${process.env.APP_BASE_URL}/api/data/v1/telemetry`,
                                requestHeaderObj: headers,
                                requestBody: result,
                                subType: networkQueue_1.NETWORK_SUBTYPE.Telemetry,
                                size: result.length,
                                count: packet.length,
                                bearerToken: true
                            };
                            // Inserting to Queue DB
                            yield this.networkQueue.add(dbData, _.get(packet, '_id'))
                                .then((data) => __awaiter(this, void 0, void 0, function* () {
                                logger_1.logger.info('Adding to Queue db successful from telemetry packet db');
                                let resp = yield this.databaseSdk.updateDoc("telemetry_packets", packet._id, { syncStatus: true, _deleted: true });
                                return resp;
                            }))
                                .catch(err => {
                                logger_1.logger.error("Adding to queue Db failed while migrating from telemetry packet db", err);
                            });
                        }
                    }));
                }
            }
            catch (error) {
                logger_1.logger.error(`Got error while migrating telemetry packet db data to queue db ${error}`);
                this.networkQueue.logTelemetryError(error);
            }
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
                let id = uuid.v4();
                let headers = {
                    "Content-Type": "application/json",
                    "Content-Encoding": "gzip",
                    did: did,
                    msgid: id
                };
                const packets = _.chunk(formatedEvents, this.TELEMETRY_PACKET_SIZE);
                for (let packet of packets) {
                    const zipData = JSON.stringify({ ts: Date.now(), events: packet, id: "api.telemetry", ver: "1.0" });
                    zlib.gzip(zipData, (error, result) => __awaiter(this, void 0, void 0, function* () {
                        if (error) {
                            throw Error(JSON.stringify(error));
                        }
                        else {
                            let dbData = {
                                pathToApi: `${process.env.APP_BASE_URL}/api/data/v1/telemetry`,
                                requestHeaderObj: headers,
                                requestBody: result,
                                subType: networkQueue_1.NETWORK_SUBTYPE.Telemetry,
                                size: result.length,
                                count: packet.length,
                                bearerToken: true
                            };
                            yield this.networkQueue.add(dbData, id);
                            logger_1.logger.info(`Added telemetry packets to queue DB of size ${packets.length}`);
                            const deleteEvents = _.map(telemetryEvents.docs, data => ({ _id: data._id, _rev: data._rev, _deleted: true }));
                            telemetryEvents = yield this.databaseSdk.bulkDocs("telemetry", deleteEvents);
                            logger_1.logger.info(`Deleted telemetry events of size ${deleteEvents.length} from telemetry db`);
                        }
                    }));
                }
            }
            catch (error) {
                logger_1.logger.error(`Error while batching the telemetry events = ${error}`);
                this.networkQueue.logTelemetryError(error);
            }
        });
    }
    archive() {
        return __awaiter(this, void 0, void 0, function* () {
            EventManager_1.EventManager.subscribe("telemetry-synced", (data) => __awaiter(this, void 0, void 0, function* () {
                let { requestBody, _id, size } = data;
                logger_1.logger.info(`Archiving telemetry started with id = ${_id}`);
                let bufferData = Buffer.from(requestBody.data);
                let fileSDK = new FileSDK_1.default("");
                yield fileSDK.mkdir("telemetry_archived");
                let filePath = fileSDK.getAbsPath(path.join("telemetry_archived", _id + "." + Date.now() + ".gz"));
                let wstream = fs.createWriteStream(filePath);
                wstream.write(bufferData);
                wstream.end();
                wstream.on("finish", () => {
                    logger_1.logger.info(`${bufferData.length} events are wrote to file ${filePath} and  deleting events from telemetry database`);
                });
                const logEvent = {
                    context: {
                        env: "telemetryManager"
                    },
                    edata: {
                        level: "INFO",
                        type: "JOB",
                        message: "Archived the telemetry events to file system",
                        params: [{ packet: _id }, { size: size }]
                    }
                };
                this.telemetryInstance.log(logEvent);
                //delete if the file is archived file is older than 10 days
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
            }));
        });
    }
};
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", networkQueue_1.NetworkQueue)
], TelemetryManager.prototype, "networkQueue", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], TelemetryManager.prototype, "databaseSdk", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", SystemSDK_1.default)
], TelemetryManager.prototype, "systemSDK", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", telemetryInstance_1.TelemetryInstance)
], TelemetryManager.prototype, "telemetryInstance", void 0);
TelemetryManager = __decorate([
    typescript_ioc_1.Singleton
], TelemetryManager);
exports.TelemetryManager = TelemetryManager;
