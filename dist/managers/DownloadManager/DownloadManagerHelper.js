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
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
const { SuDScheduler } = require("su-downloader3");
const typescript_ioc_1 = require("typescript-ioc");
const _ = __importStar(require("lodash"));
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const DownloadManager_1 = require("./DownloadManager");
const DataBaseSDK_1 = require("./../../sdks/DataBaseSDK");
const EventManager_1 = require("@project-sunbird/ext-framework-server/managers/EventManager");
const telemetryInstance_1 = require("./../../services/telemetry/telemetryInstance");
let DownloadManagerHelper = class DownloadManagerHelper {
    constructor() {
        this.dataBaseName = "download_queue";
        this.queueDownload = (downloadId, pluginId, locations, observer) => {
            return this.suDScheduler.queueDownload(downloadId, locations, observer);
        };
        this.pause = (downloadId, stop = true) => {
            return this.suDScheduler.pauseDownload(downloadId, stop);
        };
        this.cancel = (downloadId) => {
            return this.suDScheduler.killDownload(downloadId);
        };
        this.pauseAll = (stop = false) => {
            this.suDScheduler.pauseAll(stop);
        };
        this.cancelAll = () => {
            let flag = false;
            if (!_.isEmpty(this.suDScheduler.taskQueue)) {
                _.forEach(this.suDScheduler.taskQueue, task => {
                    flag = this.suDScheduler.killDownload(task.key);
                });
            }
            return false;
        };
        this.taskQueue = () => {
            return this.suDScheduler.taskQueue;
        };
        this.resumeDownload = () => {
            this.suDScheduler.startQueue();
        };
        this.downloadObserver = (downloadId, docId) => {
            return {
                next: progressInfo => {
                    (() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            const doc = yield this.dbSDK.getDoc(this.dataBaseName, docId);
                            // for initial call we will get the filesize
                            if (progressInfo.filesize) {
                                const files = _.map(doc.files, file => {
                                    if (file.id === downloadId) {
                                        file.size = progressInfo.filesize;
                                    }
                                    return file;
                                });
                                doc.files = files;
                                doc.status = DownloadManager_1.STATUS.InProgress;
                                doc.statusMsg = DownloadManager_1.STATUS_MESSAGE.InProgress;
                                let duration = (Date.now() - parseInt(doc.updatedOn)) / 1000;
                                let telemetryEvent = {
                                    context: {
                                        env: "downloadManager"
                                    },
                                    object: {
                                        id: downloadId,
                                        type: "content"
                                    },
                                    edata: {
                                        state: DownloadManager_1.STATUS.InProgress,
                                        prevstate: DownloadManager_1.STATUS.Submitted,
                                        props: ["stats.downloadedSize", "status", "updatedOn"],
                                        duration: duration
                                    }
                                };
                                this.telemetryInstance.audit(telemetryEvent);
                            }
                            //sub-sequent calls we will get downloaded count
                            if (_.get(progressInfo, "total.downloaded")) {
                                let downloaded = progressInfo.total.downloaded;
                                const files = _.map(doc.files, file => {
                                    if (file.id === downloadId) {
                                        file.downloaded = downloaded;
                                    }
                                    return file;
                                });
                                doc.files = files;
                                doc.stats.downloadedSize = _.sumBy(doc.files, file => file["downloaded"]);
                            }
                            doc.updatedOn = Date.now();
                            delete doc["_rev"];
                            yield this.dbSDK.updateDoc(this.dataBaseName, docId, doc);
                        }
                        catch (error) {
                            logger_1.logger.error("While updating progress in database", error);
                        }
                    }))();
                },
                error: error => {
                    // generate the telemetry
                    (() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            // update the status to failed and remove other un processed files from queue
                            yield this.dbSDK.updateDoc(this.dataBaseName, docId, {
                                status: DownloadManager_1.STATUS.Failed,
                                statusMsg: DownloadManager_1.STATUS_MESSAGE.Failed,
                                updatedOn: Date.now()
                            });
                            //remove pending items from downloadQueue
                            const doc = yield this.dbSDK.getDoc(this.dataBaseName, docId);
                            for (let file of doc.files) {
                                let key = `${doc._id}_${file.id}`;
                                const cancelRes = this.cancel(key);
                                logger_1.logger.info('Clearing queued download files of failed download batch', key, cancelRes);
                            }
                            let pluginId = doc.pluginId;
                            delete doc.pluginId;
                            delete doc.statusMsg;
                            delete doc._rev;
                            doc.id = doc._id;
                            delete doc._id;
                            EventManager_1.EventManager.emit(`${pluginId}:download:failed`, doc);
                            const stackTrace = error.toJSON
                                ? JSON.stringify(error.toJSON())
                                : error.stack || error.stacktrace || error.message;
                            const telemetryError = {
                                context: {
                                    env: "downloadManager"
                                },
                                object: {
                                    id: downloadId,
                                    type: "content"
                                },
                                edata: {
                                    err: "SERVER_ERROR",
                                    errtype: "SYSTEM",
                                    stacktrace: stackTrace
                                }
                            };
                            this.telemetryInstance.error(telemetryError);
                            const duration = (Date.now() - parseInt(doc.updatedOn)) / 1000;
                            const telemetryAuditEvent = {
                                context: {
                                    env: "downloadManager"
                                },
                                object: {
                                    id: downloadId,
                                    type: "content"
                                },
                                edata: {
                                    state: DownloadManager_1.STATUS.Failed,
                                    prevstate: DownloadManager_1.STATUS.InProgress,
                                    props: ["status", "updatedOn"],
                                    duration: duration
                                }
                            };
                            this.telemetryInstance.audit(telemetryAuditEvent);
                        }
                        catch (error) {
                            logger_1.logger.error(`DownloadManager: Error while downloading the data, ${error}`);
                        }
                    }))();
                    // Emit the event on error
                },
                complete: () => {
                    (() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            // log the info
                            // generate the telemetry
                            // update the status to completed
                            const doc = yield this.dbSDK.getDoc(this.dataBaseName, docId);
                            let duration = (Date.now() - parseInt(doc.updatedOn)) / 1000;
                            let telemetryEvent = {
                                context: {
                                    env: "downloadManager"
                                },
                                object: {
                                    id: downloadId,
                                    type: "content"
                                },
                                edata: {
                                    state: DownloadManager_1.STATUS.Completed,
                                    prevstate: DownloadManager_1.STATUS.InProgress,
                                    props: ["stats.downloadedSize", "status", "updatedOn"],
                                    duration: duration
                                }
                            };
                            this.telemetryInstance.audit(telemetryEvent);
                            let files = _.map(doc.files, file => {
                                if (file.id === downloadId) {
                                    file.downloaded = file.size;
                                }
                                return file;
                            });
                            let stats = doc.stats;
                            stats.downloadedFiles = doc.stats.downloadedFiles + 1;
                            stats.downloadedSize = _.sumBy(files, file => file["downloaded"]);
                            doc.files = files;
                            doc.stats = stats;
                            if (doc.stats.downloadedFiles === doc.files.length) {
                                let pluginId = doc.pluginId;
                                delete doc.pluginId;
                                delete doc.statusMsg;
                                delete doc._rev;
                                doc.id = doc._id;
                                delete doc._id;
                                doc.status = DownloadManager_1.STATUS.Completed;
                                EventManager_1.EventManager.emit(`${pluginId}:download:complete`, doc);
                                return this.dbSDK.updateDoc(this.dataBaseName, docId, {
                                    files: files,
                                    stats: stats,
                                    status: DownloadManager_1.STATUS.EventEmitted,
                                    updatedOn: Date.now()
                                });
                            }
                            else {
                                return this.dbSDK.updateDoc(this.dataBaseName, docId, {
                                    files: files,
                                    stats: stats,
                                    updatedOn: Date.now()
                                });
                            }
                        }
                        catch (error) {
                            logger_1.logger.error(`while processing download complete method ", ${error}, docId: ${docId}, fileId: ${downloadId}`);
                        }
                    }))();
                }
            };
        };
        // initialize the su downloader3 schedular
        const schedulerOptions = {
            autoStart: true,
            maxConcurrentDownloads: 1,
            downloadOptions: {
                threads: 1,
                throttleRate: 2000,
                timeout: 60000
            }
        };
        this.suDScheduler = new SuDScheduler(schedulerOptions);
    }
};
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], DownloadManagerHelper.prototype, "dbSDK", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", telemetryInstance_1.TelemetryInstance)
], DownloadManagerHelper.prototype, "telemetryInstance", void 0);
DownloadManagerHelper = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [])
], DownloadManagerHelper);
exports.DownloadManagerHelper = DownloadManagerHelper;
