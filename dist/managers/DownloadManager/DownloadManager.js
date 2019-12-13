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
const typescript_ioc_1 = require("typescript-ioc");
const _ = __importStar(require("lodash"));
const v4_1 = __importDefault(require("uuid/v4"));
const path = __importStar(require("path"));
const DataBaseSDK_1 = require("./../../sdks/DataBaseSDK");
const FileSDK_1 = __importDefault(require("./../../sdks/FileSDK"));
const DownloadManagerHelper_1 = require("./DownloadManagerHelper");
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const EventManager_1 = require("@project-sunbird/ext-framework-server/managers/EventManager");
const Url = __importStar(require("url"));
const telemetryInstance_1 = require("./../../services/telemetry/telemetryInstance");
/*
 * Below are the status for the download manager with different status
 */
var STATUS;
(function (STATUS) {
    STATUS["Submitted"] = "SUBMITTED";
    STATUS["InProgress"] = "INPROGRESS";
    STATUS["Completed"] = "COMPLETED";
    STATUS["Failed"] = "FAILED";
    STATUS["Cancelled"] = "CANCELLED";
    STATUS["EventEmitted"] = "EVENTEMITTED";
    STATUS["Paused"] = "PAUSED";
    STATUS["Canceled"] = "CANCELED";
})(STATUS = exports.STATUS || (exports.STATUS = {}));
var STATUS_MESSAGE;
(function (STATUS_MESSAGE) {
    STATUS_MESSAGE["Submitted"] = "Request is submitted. It will process soon.";
    STATUS_MESSAGE["InProgress"] = "Downloading is in progress.";
    STATUS_MESSAGE["Completed"] = "Downloaded  successfully.";
    STATUS_MESSAGE["Failed"] = "Download failed.";
})(STATUS_MESSAGE = exports.STATUS_MESSAGE || (exports.STATUS_MESSAGE = {}));
class DownloadManager {
    constructor(pluginId) {
        this.dataBaseName = "download_queue";
        /*
         * Method to queue the download of a file
         * @param files - The file urls to download
         * @param location - Path to download the file
         * @return downloadId - The download id reference
         */
        this.download = (files, location) => __awaiter(this, void 0, void 0, function* () {
            /* TODO: need to handle the error cases like
                1. when same file used to download in single file or multiple files
                2. when the it fails to add to the queue
                **/
            //ensure dest location exists
            logger_1.logger.info('OpenRap recived download request', files, location);
            yield this.fileSDK.mkdir(location);
            let docId = v4_1.default();
            // insert the download request with data to database
            if (_.isArray(files)) {
                let totalSize = _.reduce(files, (sum, file) => {
                    return sum + file.size;
                }, 0);
                let doc = {
                    pluginId: this.pluginId,
                    status: STATUS.Submitted,
                    statusMsg: STATUS_MESSAGE.Submitted,
                    createdOn: Date.now(),
                    updatedOn: Date.now(),
                    stats: {
                        totalFiles: files.length,
                        downloadedFiles: 0,
                        totalSize: totalSize,
                        downloadedSize: 0
                    },
                    files: []
                };
                for (const file of files) {
                    let fileId = file.id;
                    let downloadUrl = file.url;
                    let fileName = `${fileId}${path.extname(Url.parse(downloadUrl).pathname)}`;
                    let downloadObj = {
                        id: fileId,
                        file: fileName,
                        source: downloadUrl,
                        path: this.fileSDK.getAbsPath(location),
                        size: file.size,
                        downloaded: 0 // Downloaded until now
                    };
                    doc.files.push(downloadObj);
                    // push the request to download queue
                    let locations = {
                        url: downloadUrl,
                        savePath: this.fileSDK.getAbsPath(path.join(location, fileName))
                    };
                    // while adding to queue we will prefix with docId if same content is requested again we will download it again
                    this.downloadManagerHelper.queueDownload(`${docId}_${fileId}`, this.pluginId, locations, this.downloadManagerHelper.downloadObserver(fileId, docId));
                    let telemetryEvent = {
                        context: {
                            env: "downloadManager"
                        },
                        object: {
                            id: fileId,
                            type: "content"
                        },
                        edata: {
                            state: STATUS.Submitted,
                            props: [
                                "pluginId",
                                "stats",
                                "status",
                                "updatedOn",
                                "createdOn",
                                "files"
                            ]
                        }
                    };
                    this.telemetryInstance.audit(telemetryEvent);
                }
                logger_1.logger.info('OpenRap download request processed and sent to su-downloader3 to download', doc);
                yield this.dbSDK.insertDoc(this.dataBaseName, doc, docId);
                return Promise.resolve(docId);
            }
            else {
                let { id: fileId, url: downloadUrl, size: totalSize } = files;
                let fileName = `${fileId}${path.extname(Url.parse(downloadUrl).pathname)}`;
                let doc = {
                    pluginId: this.pluginId,
                    status: STATUS.Submitted,
                    statusMsg: "Request is submitted. It will process soon",
                    createdOn: Date.now(),
                    updatedOn: Date.now(),
                    stats: {
                        totalFiles: 1,
                        downloadedFiles: 0,
                        totalSize: totalSize,
                        downloadedSize: 0
                    },
                    files: [
                        {
                            id: fileId,
                            file: fileName,
                            source: downloadUrl,
                            path: this.fileSDK.getAbsPath(location),
                            size: totalSize,
                            downloaded: 0 // Downloaded until now
                        }
                    ]
                };
                yield this.dbSDK.insertDoc(this.dataBaseName, doc, docId);
                // push the request to download queue
                let locations = {
                    url: downloadUrl,
                    savePath: this.fileSDK.getAbsPath(path.join(location, fileName))
                };
                let telemetryEvent = {
                    context: {
                        env: "downloadManager"
                    },
                    object: {
                        id: fileId,
                        type: "content"
                    },
                    edata: {
                        state: STATUS.Submitted,
                        props: ["stats", "status", "updatedOn", "createdOn", "files"]
                    }
                };
                this.telemetryInstance.audit(telemetryEvent);
                // while adding to queue we will prefix with docId if same content is requested again we will download it again
                this.downloadManagerHelper.queueDownload(`${docId}_${fileId}`, this.pluginId, locations, this.downloadManagerHelper.downloadObserver(fileId, docId));
                return Promise.resolve(docId);
            }
        });
        /*
         * Method to get the status of the download
         * @param downloadId String
         * @return Download object
         */
        this.get = (downloadId) => __awaiter(this, void 0, void 0, function* () {
            // Read status of the request with downloadId and return downloadObject
            let downloadObject;
            downloadObject = yield this.dbSDK.getDoc(this.dataBaseName, downloadId);
            delete downloadObject.pluginId;
            delete downloadObject.statusMsg;
            delete downloadObject._rev;
            downloadObject.id = downloadObject["_id"];
            delete downloadObject["_id"];
            return Promise.resolve(downloadObject);
        });
        /*
         * Method to pause all the downloads for the given plugin
         * @param downloadId String
         */
        this.pauseAll = () => {
            //TODO: need to implement completed this is for test cases
            // this.downloadManagerHelper.pauseAll();
        };
        /*
         * Method to cancel all the downloads for the given plugin
         * @param downloadId String
         */
        this.cancelAll = () => __awaiter(this, void 0, void 0, function* () {
            // get all the downloadIds which are not completed// call killDownload with all the downloadIds on the queue and return the promise
            //TODO: need to implement
            // let flag = this.downloadManagerHelper.cancelAll()
            // // get the docs which are in status submitted and in progress
            // let { docs } = await this.dbSDK.find(this.dataBaseName, {
            //     selector: {
            //         status: { "$in": [STATUS.Submitted, STATUS.InProgress] }
            //     }
            // })
            // // change the status of the docs to cancelled
            // if (docs.length) {
            //     let updatedDocs = _.map(docs, doc => {
            //         doc.status = STATUS.Cancelled;
            //         return doc;
            //     })
            //     await this.dbSDK.bulkDocs(this.dataBaseName, updatedDocs)
            // }
            return Promise.resolve(true);
        });
        /*
         * Method to list the download queue based on the status
         * @param status String - The status of the download - Submitted, Complete, InProgress, Failed. Blank option will return all status
         * @return Array - Array of download objects
         */
        this.list = (status) => __awaiter(this, void 0, void 0, function* () {
            // get the list of items from database if status is provided otherwise get all the status
            let downloadObjects = [];
            let selector = {
                selector: {},
                fields: ["status", "createdOn", "updatedOn", "stats", "files", "_id"]
            };
            if (status) {
                selector.selector = {
                    status: {
                        $in: status
                    }
                };
            }
            let { docs } = yield this.dbSDK.find(this.dataBaseName, selector);
            downloadObjects = _.map(docs, doc => {
                doc.id = doc["_id"];
                delete doc["_id"];
                return doc;
            });
            return Promise.resolve(downloadObjects);
        });
        this.pluginId = pluginId;
        this.fileSDK = new FileSDK_1.default(pluginId);
    }
    /*
     * Method to pause the download
     * @param downloadId String
     */
    pause(downloadId) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.info('OpenRap pause download request received for:', downloadId);
            let doc = yield this.dbSDK.getDoc(this.dataBaseName, downloadId)
                .catch(err => logger_1.logger.error(`while getting the doc to pause doc_id ${downloadId}, err: ${err}`));
            let pausedInQueue = false;
            if (_.isEmpty(doc)) {
                throw {
                    code: "DOC_NOT_FOUND",
                    status: 400,
                    message: `Download Document not found with id ${downloadId}`
                };
            }
            for (let file of doc.files) {
                if (file.size > file.downloaded) {
                    let key = `${doc._id}_${file.id}`;
                    const pauseRes = this.downloadManagerHelper.cancel(key);
                    if (pauseRes) {
                        pausedInQueue = true;
                    }
                }
            }
            if (pausedInQueue) {
                yield this.dbSDK.updateDoc(this.dataBaseName, doc._id, {
                    updatedOn: Date.now(),
                    status: STATUS.Paused
                });
                return true;
            }
            else {
                throw {
                    code: "NO_FILES_IN_QUEUE",
                    status: 400,
                    message: `No files are in queue for id ${downloadId}`
                };
            }
        });
    }
    ;
    /*
     * Method to cancel the download
     * @param downloadId String
     */
    cancel(downloadId) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.info('OpenRap cancel download request received for:', downloadId);
            let doc = yield this.dbSDK.getDoc(this.dataBaseName, downloadId)
                .catch(err => logger_1.logger.error(`Error while getting the doc to cancel doc_id ${downloadId}, err: ${err}`));
            let canceledInQueue = false;
            if (_.isEmpty(doc)) {
                throw {
                    code: "DOC_NOT_FOUND",
                    status: 400,
                    message: `Download Document not found with id ${downloadId}`
                };
            }
            const deleteItems = [];
            for (let file of doc.files) {
                if (file.size > file.downloaded) {
                    let key = `${doc._id}_${file.id}`;
                    const cancelRes = this.downloadManagerHelper.cancel(key);
                    if (cancelRes) {
                        canceledInQueue = true;
                    }
                }
                else {
                    deleteItems.push(path.join(file.path, file.file));
                }
            }
            if (canceledInQueue || doc.status === STATUS.Paused) {
                yield this.dbSDK.updateDoc(this.dataBaseName, doc._id, {
                    updatedOn: Date.now(),
                    status: STATUS.Canceled
                });
                _.forEach(deleteItems, file => this.fileSDK.remove(file));
                return true;
            }
            else {
                throw {
                    code: "NO_FILES_IN_QUEUE",
                    status: 400,
                    message: `No files are in queue for id ${downloadId}`
                };
            }
        });
    }
    ;
    /*
     * Method to retry the download which failed
     * @param downloadId String
     */
    retry(downloadId) {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.info('OpenRap retry download request received for:', downloadId);
            let doc = yield this.dbSDK.getDoc(this.dataBaseName, downloadId)
                .catch(err => logger_1.logger.error(`Error while getting the doc to cancel doc_id ${downloadId}, err: ${err}`));
            if (_.isEmpty(doc)) {
                throw {
                    code: "DOC_NOT_FOUND",
                    status: 400,
                    message: `Download Document not found with id ${downloadId}`
                };
            }
            if (doc.status !== STATUS.Failed) {
                throw {
                    code: "INVALID_OPERATION",
                    status: 400,
                    message: `Only failed items can be retried`
                };
            }
            yield this.resume(doc._id);
            return true;
        });
    }
    // this is for test cases only
    downloadQueue() {
        return this.downloadManagerHelper.taskQueue();
    }
    resume(downloadId) {
        return __awaiter(this, void 0, void 0, function* () {
            // get the data from db with download id
            let doc = yield this.dbSDK
                .getDoc(this.dataBaseName, downloadId)
                .catch(err => {
                logger_1.logger.error(`while getting the doc to resume doc_id ${downloadId}, err: ${err}`);
            });
            let addedToQueue = false;
            if (_.isEmpty(doc)) {
                throw {
                    code: "DOC_NOT_FOUND",
                    status: 400,
                    message: `Download Document not found with id ${downloadId}`
                };
            }
            for (let file of doc.files) {
                if (file.size > file.downloaded) {
                    // push the request to download queue
                    let locations = {
                        url: file.source,
                        savePath: path.join(file.path, file.file)
                    };
                    // while adding to queue we will prefix with docId if same content is requested again we will download it again
                    try {
                        let downloadQueue = this.downloadQueue();
                        let key = `${doc._id}_${file.id}`;
                        if (!_.find(downloadQueue, { key: key })) {
                            addedToQueue = true;
                            this.downloadManagerHelper.queueDownload(key, doc.pluginId, locations, this.downloadManagerHelper.downloadObserver(file.id, doc._id));
                        }
                    }
                    catch (error) {
                        logger_1.logger.error(`while adding to queue doc ${JSON.stringify(doc)}, error : ${error}`);
                    }
                }
            }
            if (addedToQueue) {
                yield this.dbSDK.updateDoc(this.dataBaseName, doc._id, {
                    updatedOn: Date.now()
                });
            }
        });
    }
}
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", DownloadManagerHelper_1.DownloadManagerHelper)
], DownloadManager.prototype, "downloadManagerHelper", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", telemetryInstance_1.TelemetryInstance)
], DownloadManager.prototype, "telemetryInstance", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], DownloadManager.prototype, "dbSDK", void 0);
exports.default = DownloadManager;
/*
     This method will ensure that when the service is started/restarted updates the queue using data from download_queue database
     */
exports.reconciliation = () => __awaiter(this, void 0, void 0, function* () {
    // Get the data from database where status is completed
    let dbSDK = new DataBaseSDK_1.DataBaseSDK();
    let telemetryInstance = new telemetryInstance_1.TelemetryInstance();
    let dataBaseName = "download_queue";
    let completedData = yield dbSDK
        .find(dataBaseName, {
        selector: {
            status: STATUS.Completed
        }
    })
        .catch(err => {
        logger_1.logger.error(`reconciliation database call to get the completed docs ${err}`);
    });
    if (_.get(completedData, "docs") && !_.isEmpty(completedData.docs)) {
        for (let doc of completedData.docs) {
            let eventDoc = _.cloneDeep(doc);
            eventDoc.id = doc._id;
            delete eventDoc._id;
            delete eventDoc._rev;
            delete eventDoc.pluginId;
            delete eventDoc.statusMsg;
            EventManager_1.EventManager.emit(`${doc.pluginId}:download:complete`, eventDoc);
            yield dbSDK.updateDoc(dataBaseName, doc._id, {
                status: STATUS.EventEmitted
            });
        }
    }
    let pendingDownloads = yield dbSDK
        .find(dataBaseName, {
        selector: {
            status: {
                $in: [STATUS.Submitted, STATUS.InProgress]
            }
        }
    })
        .catch(err => {
        logger_1.logger.error("reconciliation database call to get the completed docs ", err);
    });
    if (_.get(pendingDownloads, "docs") && !_.isEmpty(pendingDownloads.docs)) {
        for (let doc of pendingDownloads.docs) {
            let downloadManager = new DownloadManager(doc.pluginId);
            yield downloadManager.resume(doc._id).catch(err => {
                logger_1.logger.error(`while adding the pending items to download queue ${JSON.stringify(doc)} err: ${err}`);
            });
        }
    }
    let telemetryEvent = {
        context: {
            env: "downloadManager"
        },
        edata: {
            level: "INFO",
            type: "OTHER",
            message: "Download manager reconciliation on starting the app",
            params: [
                {
                    PENDING: _.get(pendingDownloads, "docs")
                        ? _.get(pendingDownloads, "docs").length
                        : 0
                },
                {
                    COMPLETED: _.get(completedData, "docs")
                        ? _.get(completedData, "docs").length
                        : 0
                }
            ]
        }
    };
    telemetryInstance.log(telemetryEvent);
});
