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
const _ = __importStar(require("lodash"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const logger_1 = require("@project-sunbird/logger");
const DataBaseSDK_1 = require("../../sdks/DataBaseSDK");
const typescript_ioc_1 = require("typescript-ioc");
const FileSDK_1 = __importDefault(require("../../sdks/FileSDK"));
const stream_1 = require("stream");
const SettingSDK_1 = __importDefault(require("../../sdks/SettingSDK"));
const SystemSDK_1 = __importDefault(require("../../sdks/SystemSDK"));
const telemetry_helper_1 = require("./telemetry-helper");
let TelemetryExport = class TelemetryExport {
    constructor() {
        this.telemetryShareItems = [];
        this.setDeviceID();
    }
    setDeviceID() {
        return __awaiter(this, void 0, void 0, function* () {
            this.deviceId = yield this.systemSDK.getDeviceId();
        });
    }
    export(destFolder, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            this.destFolder = destFolder;
            this.cb = cb;
            try {
                if (!this.destFolder) {
                    throw {
                        code: "BAD_REQUEST",
                        status: 400,
                        message: 'Destination path is missing'
                    };
                }
                let fileSDK = new FileSDK_1.default("");
                let dbData = yield this.databaseSdk.find("queue", {
                    selector: {
                        subType: 'TELEMETRY',
                    },
                    fields: ['_id', 'size', 'requestHeaderObj', 'count']
                });
                if (!dbData.docs.length) {
                    throw {
                        code: "DATA_NOT_FOUND",
                        status: 404,
                        message: 'No data to export'
                    };
                }
                this.telemetryArchive = fileSDK.archiver();
                let items = [];
                this.telemetryShareItems = [];
                _.forEach(dbData.docs, (data) => {
                    items.push({
                        objectType: 'telemetry',
                        file: `${data._id}.gz`,
                        contentEncoding: 'gzip',
                        size: data.size,
                        explodedSize: data.size,
                        mid: _.get(data, 'requestHeaderObj.msgid'),
                        eventsCount: data.count
                    });
                    this.telemetryShareItems.push({
                        id: _.get(data, "_id"),
                        type: "Telemetry",
                        params: [
                            { count: _.toString(_.get(data, "count")) },
                            { size: _.toString(_.get(data, "size")) },
                        ],
                        origin: {
                            id: this.deviceId,
                            type: "Device",
                        },
                    });
                    this.archiveAppend("stream", this.getStream(data._id), `${data._id}.gz`);
                });
                this.archiveAppend("buffer", this.getManifestBuffer(dbData.docs.length, items), "manifest.json");
                yield this.streamZip();
                this.cb(null, 'success');
            }
            catch (error) {
                this.cb(error, null);
            }
        });
    }
    getStream(id) {
        let getData = (id) => {
            return new Promise((resolve, reject) => {
                this.databaseSdk.getDoc('queue', id).then((dbData) => {
                    resolve(Buffer.from(dbData.requestBody.data));
                }).catch((err) => {
                    reject(err);
                });
            });
        };
        const inStream = new stream_1.Readable({
            read() {
                getData(id).then(data => {
                    this.push(data);
                    this.push(null);
                }).catch((err) => {
                    logger_1.logger.log(`Received error while getting stream: ${err}`);
                    this.push('No Data found');
                    this.push(null);
                });
            }
        });
        return inStream;
    }
    archiveAppend(type, src, dest) {
        if (type === "path") {
            this.telemetryArchive.append(fs.createReadStream(src), { name: dest });
        }
        else if (type === "stream") {
            this.telemetryArchive.append(src, { name: dest });
        }
        else if (type === "createDir") {
            dest = dest.endsWith("/") ? dest : dest + "/";
            this.telemetryArchive.append(null, { name: dest });
        }
        else if (type === "buffer") {
            this.telemetryArchive.append(src, { name: dest });
        }
    }
    getManifestBuffer(count, items) {
        const manifestData = {
            id: "sunbird.data.archive",
            ver: process.env.APP_VERSION,
            ts: new Date(),
            producer: {
                id: process.env.APP_ID,
                ver: process.env.APP_VERSION,
                pid: "desktop.app"
            },
            archive: {
                count: count,
                items: items
            },
        };
        return Buffer.from(JSON.stringify(manifestData));
    }
    streamZip() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const filePath = path.join(this.destFolder, `telemetry_${this.deviceId}_${Date.now()}.zip`);
                const output = fs.createWriteStream(filePath);
                output.on("close", () => resolve({}));
                this.telemetryArchive.on("end", () => {
                    logger_1.logger.log("Data has been zipped");
                    this.settingSDK.put('telemetryExportedInfo', { lastExportedOn: Date.now() });
                    this.generateShareEvent(this.telemetryShareItems);
                });
                this.telemetryArchive.on("error", reject);
                this.telemetryArchive.finalize();
                this.telemetryArchive.pipe(output);
            });
        });
    }
    info(cb) {
        return __awaiter(this, void 0, void 0, function* () {
            this.cb = cb;
            try {
                let dbData = yield this.databaseSdk.find("queue", {
                    selector: { subType: 'TELEMETRY' },
                    fields: ['size']
                });
                let totalSize = 0;
                if (dbData.docs.length) {
                    _.forEach(dbData.docs, (data) => {
                        totalSize += data.size;
                    });
                }
                let exportedDate;
                try {
                    exportedDate = yield this.settingSDK.get('telemetryExportedInfo');
                }
                catch (error) {
                    exportedDate = { lastExportedOn: null };
                }
                this.cb(null, { totalSize: totalSize, lastExportedOn: exportedDate.lastExportedOn });
            }
            catch (error) {
                this.cb(error, null);
            }
        });
    }
    generateShareEvent(shareItems) {
        const telemetryEvent = {
            context: {
                env: "Telemetry",
            },
            edata: {
                dir: "Out",
                type: "File",
                items: shareItems,
            },
        };
        this.telemetryHelper.share(telemetryEvent);
    }
};
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], TelemetryExport.prototype, "databaseSdk", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", SettingSDK_1.default)
], TelemetryExport.prototype, "settingSDK", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", SystemSDK_1.default)
], TelemetryExport.prototype, "systemSDK", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", telemetry_helper_1.TelemetryHelper)
], TelemetryExport.prototype, "telemetryHelper", void 0);
TelemetryExport = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [])
], TelemetryExport);
exports.TelemetryExport = TelemetryExport;
