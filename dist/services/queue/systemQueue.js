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
const typescript_ioc_1 = require("typescript-ioc");
const _ = __importStar(require("lodash"));
const typescript_ioc_2 = require("typescript-ioc");
const DataBaseSDK_1 = require("../../sdks/DataBaseSDK");
const IQueue_1 = require("./IQueue");
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const uuid = require("uuid");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const DEFAULT_CONCURRENCY = {
    "openrap-sunbirded-plugin_IMPORT": 1,
    "openrap-sunbirded-plugin_DOWNLOAD": 1,
    "openrap-sunbirded-plugin_DELETE": 1,
    default: 1
};
let SystemQueue = class SystemQueue {
    constructor() {
        this.dbName = 'system_queue';
        this.registeredTasks = {};
        this.runningTasks = [];
        this.lockTaskExecuter = false;
        this.config = {
            concurrency: DEFAULT_CONCURRENCY
        };
    }
    /**
     * method to initializes system queue.
     * This method should be called after all plugin and app are initialized
     * @param config
     */
    initialize(config) {
        return __awaiter(this, void 0, void 0, function* () {
            // this.config = config; TODO: support configurable concurrency
            const { docs } = yield this.dbSDK.find(this.dbName, { selector: { status: IQueue_1.SystemQueueStatus.inProgress } })
                .catch((err) => {
                logger_1.logger.log("reconcile error while fetching inProgress content from DB", err.message);
                return { docs: [] };
            });
            logger_1.logger.info("length of inProgress jobs found while reconcile", docs.length);
            if (docs.length) { // reconcile
                const updateQuery = _.map(docs, (job) => {
                    job.status = IQueue_1.SystemQueueStatus.reconcile;
                    return job;
                });
                yield this.dbSDK.bulkDocs(this.dbName, updateQuery)
                    .catch((err) => logger_1.logger.log("reconcile error while updating status to DB", err.message));
            }
            this.executeNextTask();
            setInterval(this.trackTaskProgress, 1000);
        });
    }
    /**
     * method to track progress of task.
     * this method will stop the task for which progress is not updated for configured time
     * and pick next task in queue
     */
    trackTaskProgress() {
        //TODO: implement progress track method
    }
    /**
     * method to register task with taskExecuters.
     * @param plugin
     * @param type
     * @param taskExecuter
     * @param supportedActions
     */
    register(plugin, type, taskExecuter, supportedActions) {
        if (!plugin || !type || !taskExecuter) {
            logger_1.logger.error('Task was not registered because of missing mandatory fields', plugin, type, taskExecuter);
            return;
        }
        if (this.registeredTasks[`${plugin}_${type}`]) {
            logger_1.logger.warn('SystemQueue is overriding already registered Task for', `${plugin} ${type}`, 'with new handler', taskExecuter);
        }
        this.registeredTasks[`${plugin}_${type}`] = {
            plugin,
            type,
            taskExecuter,
            supportedActions
        };
    }
    /**
     * method to add task to queue.
     * In order for SystemQueue to execute a task, executer for the same should already be registered by plugin.
     * @param plugin
     * @param tasks
     */
    add(plugin, tasks) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(tasks)) {
                throw {
                    code: "TASK_DATA_MISSING",
                    status: 400,
                    message: "Task data is missing or empty"
                };
            }
            tasks = _.isArray(tasks) ? tasks : [tasks];
            const queueData = tasks.map((task, index) => (Object.assign({}, task, { _id: uuid(), createdOn: Date.now() + index, updatedOn: Date.now() + index, status: IQueue_1.SystemQueueStatus.inQueue, progress: 0, plugin, priority: 1, runTime: 0, isActive: true })));
            logger_1.logger.info("Adding to queue for", plugin, queueData.length);
            yield this.dbSDK.bulkDocs(this.dbName, queueData)
                .catch((err) => logger_1.logger.error("SystemQueue, Error while adding task in db", err.message));
            this.executeNextTask();
            return queueData.map(({ _id }) => _id);
        });
    }
    executeNextTask() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.debug("executeNextTask method called", this.lockTaskExecuter, this.runningTasks);
            if (this.lockTaskExecuter) { // prevent picking of same task more than once(for handling race condition)
                return;
            }
            try {
                // TODO: should support all configs, currently only supports task concurrency
                this.lockTaskExecuter = true;
                const fetchQuery = [];
                let groupedRunningTask = _.groupBy(this.runningTasks, (task) => `${task.plugin}_${task.type}`);
                _.forIn(this.registeredTasks, (value, key) => {
                    const concurrency = this.config.concurrency[key] || this.config.concurrency.default;
                    if ((_.get(groupedRunningTask[key], 'length') || 0) < concurrency) {
                        fetchQuery.push({ plugin: value.plugin, type: value.type });
                    }
                });
                logger_1.logger.debug("Fetch query for system queue execution", fetchQuery, groupedRunningTask);
                if (!fetchQuery.length) {
                    this.lockTaskExecuter = false;
                    return;
                }
                const selector = {
                    status: { $in: [IQueue_1.SystemQueueStatus.inQueue, IQueue_1.SystemQueueStatus.resume] },
                    plugin: { $in: fetchQuery.map(data => data.plugin) },
                    type: { $in: fetchQuery.map(data => data.type) }
                };
                const { docs } = yield this.dbSDK.find(this.dbName, { selector: selector }) // sort: ["createdOn"]
                    .catch((err) => {
                    logger_1.logger.error("Error while fetching queued jobs in pickNextTask", err.message);
                    return { docs: [] };
                });
                if (!docs || !docs.length) {
                    this.lockTaskExecuter = false;
                    return;
                }
                groupedRunningTask = _.groupBy(this.runningTasks, (task) => `${task.plugin}_${task.type}`);
                logger_1.logger.debug("Docs found during execution", docs.length, groupedRunningTask);
                let queuedTaskIndex = 0;
                while (docs[queuedTaskIndex]) {
                    const task = docs[queuedTaskIndex];
                    const taskExecuter = _.get(this.registeredTasks[`${task.plugin}_${task.type}`], 'taskExecuter');
                    const runningTaskCount = (_.get(groupedRunningTask[`${task.plugin}_${task.type}`], 'length') || 0);
                    const concurrency = this.config.concurrency[`${task.plugin}_${task.type}`] || this.config.concurrency.default;
                    if (taskExecuter && (runningTaskCount < concurrency)) {
                        const taskExecuterRef = new taskExecuter();
                        const syncFunc = this.getTaskSyncFun(task);
                        const observer = this.getTaskObserver(task, syncFunc);
                        task.status = IQueue_1.SystemQueueStatus.inProgress;
                        task.progress = 0;
                        syncFunc.next(task);
                        taskExecuterRef.start(task, observer);
                        const runningTaskRef = {
                            _id: task._id,
                            type: task.type,
                            plugin: task.plugin,
                            taskExecuterRef,
                            startTime: Date.now(),
                            lastKnowProgress: task.progress,
                            lastKnowProgressUpdatedTime: Date.now(),
                            syncFunc,
                        };
                        this.runningTasks.push(runningTaskRef);
                        if (!groupedRunningTask[`${task.plugin}_${task.type}`]) {
                            groupedRunningTask[`${task.plugin}_${task.type}`] = [];
                        }
                        groupedRunningTask[`${task.plugin}_${task.type}`].push(runningTaskRef);
                        logger_1.logger.debug("Executing task ", runningTaskRef._id, runningTaskRef.type, runningTaskRef.plugin);
                    }
                    else if (!taskExecuter) {
                        // TODO: fail all task which doesn't have task Executers
                        logger_1.logger.error('TaskExecuter not found for task', task.plugin, task.type);
                    }
                    queuedTaskIndex++;
                }
            }
            catch (err) {
                logger_1.logger.error("Error while executing task", err.message);
            }
            finally {
                this.lockTaskExecuter = false;
                logger_1.logger.info("exited executeNextTask method");
            }
        });
    }
    getTaskSyncFun(taskData) {
        const syncData$ = new rxjs_1.Subject();
        const updateDbObservable = (data) => {
            return new rxjs_1.Observable(subscriber => {
                data._id = taskData._id;
                delete data._rev;
                this.dbSDK.updateDoc(this.dbName, taskData._id, data)
                    .then(data => {
                    taskData._rev = data.rev;
                    subscriber.complete();
                    return taskData._rev = data.rev;
                })
                    .catch(err => {
                    subscriber.complete();
                    logger_1.logger.error("Error while update doc for task", taskData._id, err.message);
                });
            });
        };
        syncData$.pipe(operators_1.throttleTime(500, rxjs_1.asyncScheduler, { leading: true, trailing: true }), operators_1.mergeMap(data => updateDbObservable(data))).subscribe((data) => {
            // updateDb(data);
        }, error => {
            // updateDb(taskData);
        }, () => {
            _.remove(this.runningTasks, (job) => job._id === taskData._id);
            this.executeNextTask();
        });
        return syncData$;
    }
    getTaskObserver(queueCopy, syncFun) {
        const next = (data) => {
            queueCopy = data;
            const runningTaskRef = _.find(this.runningTasks, { _id: queueCopy._id });
            queueCopy.runTime = runningTaskRef ? queueCopy.runTime + (Date.now() - runningTaskRef.startTime) / 1000 : queueCopy.runTime;
            syncFun.next(queueCopy);
        };
        const error = (err) => {
            queueCopy.status = IQueue_1.SystemQueueStatus.failed;
            queueCopy.failedCode = err.code;
            queueCopy.failedReason = err.message;
            queueCopy.isActive = false;
            const runningTaskRef = _.find(this.runningTasks, { _id: queueCopy._id });
            queueCopy.runTime = runningTaskRef ? queueCopy.runTime + (Date.now() - runningTaskRef.startTime) / 1000 : queueCopy.runTime;
            syncFun.next(queueCopy);
            syncFun.complete();
        };
        const complete = () => {
            queueCopy.isActive = false;
            queueCopy.status = IQueue_1.SystemQueueStatus.completed;
            const runningTaskRef = _.find(this.runningTasks, { _id: queueCopy._id });
            queueCopy.runTime = runningTaskRef ? queueCopy.runTime + (Date.now() - runningTaskRef.startTime) / 1000 : queueCopy.runTime;
            syncFun.next(queueCopy);
            syncFun.complete();
        };
        return { next, error, complete };
    }
    query(plugin, query, sort) {
        const selector = Object.assign({}, query, { plugin });
        return this.dbSDK.find(this.dbName, { selector: selector });
    }
    pause(plugin, _id) {
        return __awaiter(this, void 0, void 0, function* () {
            const inProgressJob = _.find(this.runningTasks, { _id });
            if (inProgressJob) {
                const res = yield inProgressJob.taskExecuterRef.pause();
                if (res !== true) {
                    throw res || "INVALID_OPERATION";
                }
                const queueData = inProgressJob.taskExecuterRef.status();
                queueData.status = IQueue_1.SystemQueueStatus.paused;
                inProgressJob.syncFunc.next(queueData);
                inProgressJob.syncFunc.complete();
            }
            else {
                const dbResults = yield this.dbSDK.getDoc(this.dbName, _id)
                    .catch((err) => logger_1.logger.error("pause error while fetching job details for ", _id));
                if (!dbResults || _.includes([IQueue_1.SystemQueueStatus.canceled, IQueue_1.SystemQueueStatus.completed, IQueue_1.SystemQueueStatus.failed,
                    IQueue_1.SystemQueueStatus.pausing, IQueue_1.SystemQueueStatus.canceling], dbResults.status)) {
                    throw "INVALID_OPERATION";
                }
                dbResults.status = IQueue_1.SystemQueueStatus.paused;
                yield this.dbSDK.updateDoc(this.dbName, _id, dbResults)
                    .catch((err) => logger_1.logger.error("pause error while updating job details for ", _id));
                this.executeNextTask();
            }
        });
    }
    resume(plugin, _id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbResults = yield this.dbSDK.getDoc(this.dbName, _id)
                .catch((err) => logger_1.logger.error("resume error while fetching job details for ", _id));
            if (!dbResults || !_.includes([IQueue_1.SystemQueueStatus.paused], dbResults.status)) {
                throw "INVALID_OPERATION";
            }
            dbResults.status = IQueue_1.SystemQueueStatus.resume;
            yield this.dbSDK.updateDoc(this.dbName, _id, dbResults)
                .catch((err) => logger_1.logger.error("resume error while updating job details for ", _id));
            this.executeNextTask();
        });
    }
    cancel(plugin, _id) {
        return __awaiter(this, void 0, void 0, function* () {
            const inProgressJob = _.find(this.runningTasks, { _id });
            if (inProgressJob) {
                const res = yield inProgressJob.taskExecuterRef.cancel();
                if (res !== true) {
                    throw res || "INVALID_OPERATION";
                }
                const queueData = inProgressJob.taskExecuterRef.status();
                queueData.status = IQueue_1.SystemQueueStatus.canceled;
                queueData.isActive = false;
                inProgressJob.syncFunc.next(queueData);
                inProgressJob.syncFunc.complete();
            }
            else {
                const dbResults = yield this.dbSDK.getDoc(this.dbName, _id)
                    .catch((err) => logger_1.logger.error("cancel error while fetching job details for ", _id));
                if (!dbResults || _.includes([IQueue_1.SystemQueueStatus.canceled, IQueue_1.SystemQueueStatus.completed, IQueue_1.SystemQueueStatus.failed,
                    IQueue_1.SystemQueueStatus.pausing, IQueue_1.SystemQueueStatus.canceling], dbResults.status)) {
                    throw "INVALID_OPERATION";
                }
                dbResults.status = IQueue_1.SystemQueueStatus.canceled;
                yield this.dbSDK.updateDoc(this.dbName, _id, dbResults)
                    .catch((err) => logger_1.logger.error("cancel error while updating job details for ", _id));
                this.executeNextTask();
            }
        });
    }
    retry(plugin, _id) {
        return __awaiter(this, void 0, void 0, function* () {
            const dbResults = yield this.dbSDK.getDoc(this.dbName, _id)
                .catch((err) => logger_1.logger.error("retry error while fetching job details for ", _id));
            if (!dbResults || !_.includes([IQueue_1.SystemQueueStatus.failed], dbResults.status)) {
                throw "INVALID_OPERATION";
            }
            dbResults.status = IQueue_1.SystemQueueStatus.inQueue;
            yield this.dbSDK.updateDoc(this.dbName, _id, dbResults)
                .catch((err) => logger_1.logger.error("retry error while updating job details for ", _id));
            this.executeNextTask();
        });
    }
    //TODO: support custom actions
    // TODO: Need to remove this in next release 
    migrate(queueData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(queueData)) {
                throw {
                    code: "TASK_DATA_MISSING",
                    status: 400,
                    message: "Task data is missing or empty"
                };
            }
            yield this.dbSDK.bulkDocs(this.dbName, queueData)
                .catch((err) => logger_1.logger.error("SystemQueue migration, Error while adding task in db", err.message));
            this.executeNextTask();
            return queueData.map(({ _id }) => _id);
        });
    }
};
__decorate([
    typescript_ioc_2.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], SystemQueue.prototype, "dbSDK", void 0);
SystemQueue = __decorate([
    typescript_ioc_1.Singleton
], SystemQueue);
exports.SystemQueue = SystemQueue;
