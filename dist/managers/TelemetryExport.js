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
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const DataBaseSDK_1 = require("../sdks/DataBaseSDK");
const typescript_ioc_1 = require("typescript-ioc");
const FileSDK_1 = __importDefault(require("../sdks/FileSDK"));
const stream_1 = require("stream");
let TelemetryExport = class TelemetryExport {
    constructor(destFolder) {
        this.destFolder = destFolder;
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
                    this.destroy(err);
                });
            }
        });
        return inStream;
    }
    archiveAppend(type, src, dest) {
        logger_1.logger.info(`Adding ${src} of type ${type} to dest folder ${dest}`);
        if (type === "path") {
            this.telemetryArchive.append(fs.createReadStream(src), { name: dest });
        }
        else if (type === "directory") {
            this.telemetryArchive.directory(src, dest);
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
            ver: "1.0",
            ts: new Date(),
            producer: {
                id: 'did',
                pid: '',
                ver: '',
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
                const ecarFilePath = path.join(this.destFolder, 'telemetry.zip');
                const output = fs.createWriteStream(ecarFilePath);
                output.on("close", () => resolve({}));
                output.on('finish', () => {
                    console.log('====================finish');
                });
                output.on("error", () => {
                    console.log('====================error');
                });
                this.telemetryArchive.on("end", () => {
                    console.log('done+++++++++++++++++++++++++++++++++++++');
                });
                this.telemetryArchive.on("error", () => {
                    console.log('error+++++++++++++++++++++++++++++++++++++');
                });
                this.telemetryArchive.on("finish", () => {
                    console.log('finish+++++++++++++++++++++++++++++++++++++');
                });
                this.telemetryArchive.finalize();
                this.telemetryArchive.pipe(output);
            });
        });
    }
    export(cb) {
        return __awaiter(this, void 0, void 0, function* () {
            this.cb = cb;
            try {
                let fileSDK = new FileSDK_1.default("");
                let dbData = yield this.databaseSdk.find("queue", {
                    selector: {
                        subType: 'TELEMETRY',
                    },
                    fields: ['_id', 'size', 'requestHeaderObj', 'count']
                });
                if (!dbData.docs.length) {
                    throw Error('No telemetry data to export');
                }
                this.telemetryArchive = fileSDK.archiver();
                let items = [];
                _.forEach(dbData.docs, (data) => {
                    items.push({
                        objectType: 'telemetry',
                        file: `${data._id}.gz`,
                        contentEncoding: 'gzip',
                        size: data.size,
                        explodedSize: 1,
                        mid: _.get(data, 'requestHeaderObj.msgid'),
                        eventsCount: data.count
                    });
                    this.archiveAppend("stream", this.getStream(data._id), `${data._id}.gz`);
                });
                this.archiveAppend("buffer", this.getManifestBuffer(dbData.docs.length, items), "manifest.json");
                const data = yield this.streamZip();
                console.log('====================completed', data);
                this.cb(null, data);
            }
            catch (error) {
                this.cb(error, null);
            }
        });
    }
};
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], TelemetryExport.prototype, "databaseSdk", void 0);
TelemetryExport = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [Object])
], TelemetryExport);
exports.TelemetryExport = TelemetryExport;
