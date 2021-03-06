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
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const uuid = require("uuid");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
let SystemQueue = class SystemQueue {
    constructor() {
        this.dbName = 'system_queue';
        this.registeredTasks = {};
        this.runningTasks = [];
        this.lockTaskExecuter = false;
        this.config = {
            concurrency: 1,
            concurrencyLevel: ConcurrencyLevel.task // runs one task at a time for each type of task per plugin
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
            const { docs } = yield this.dbSDK.find(this.dbName, { selector: { status: SystemQueueStatus.inProgress } })
                .catch((err) => {
                logger_1.logger.log("reconcile error while fetching inProgress content from DB", err.message);
                return { docs: [] };
            });
            logger_1.logger.info("length of inProgress jobs found while reconcile", docs.length);
            if (docs.length) { // reconcile
                const updateQuery = _.map(docs, (job) => {
                    job.status = SystemQueueStatus.reconcile;
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
            const queueData = tasks.map(task => (Object.assign({}, task, { _id: uuid(), createdOn: Date.now(), updatedOn: Date.now(), status: SystemQueueStatus.inQueue, progress: 0, plugin, priority: 1, runTime: 0, isActive: true })));
            yield this.dbSDK.bulkDocs(this.dbName, queueData)
                .catch((err) => logger_1.logger.error("SystemQueue, Error while adding task in db", err.message));
            this.executeNextTask();
            return queueData.map(({ _id }) => _id);
        });
    }
    executeNextTask() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.lockTaskExecuter) { // prevent picking of same task more than once(for handling race condition)
                return;
            }
            try {
                // TODO: should support all configs, currently only supports task concurrency
                this.lockTaskExecuter = true;
                const fetchQuery = [];
                let groupedRunningTask = _.groupBy(this.runningTasks, (task) => `${task.plugin}_${task.type}`);
                _.forIn(this.registeredTasks, (value, key) => {
                    if (_.get(groupedRunningTask[key], 'length') < this.config.concurrencyLevel) {
                        fetchQuery.push({ plugin: value.plugin, type: value.type });
                    }
                });
                if (!fetchQuery.length) {
                    return;
                }
                const selector = {
                    status: { $in: [SystemQueueStatus.inQueue, SystemQueueStatus.resume] },
                    plugin: { $in: fetchQuery.map(data => data.plugin) },
                    type: { $in: fetchQuery.map(data => data.type) }
                };
                const { docs } = yield this.dbSDK.find(this.dbName, { selector: selector, sort: ["createdOn"] })
                    .catch((err) => {
                    logger_1.logger.error("Error while fetching queued jobs in pickNextTask", err.message);
                    return { docs: [] };
                });
                groupedRunningTask = _.groupBy(this.runningTasks, (task) => `${task.plugin}_${task.type}`);
                let queuedTaskIndex = 0;
                while (docs[queuedTaskIndex]) {
                    const task = docs[queuedTaskIndex];
                    const taskExecuter = _.get(this.registeredTasks[`${task.plugin}_${task.type}`], 'taskExecuter');
                    if (taskExecuter && _.get(groupedRunningTask[`${task.plugin}_${task.type}`], 'length') < this.config.concurrencyLevel) {
                        const taskExecuterRef = new taskExecuter();
                        const syncFunc = this.getTaskSyncFun(task);
                        const observer = this.getTaskObserver(task, syncFunc);
                        task.status = SystemQueueStatus.inProgress;
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
                        groupedRunningTask[`${task.plugin}_${task.type}`].push(runningTaskRef);
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
            }
        });
    }
    getTaskSyncFun(taskData) {
        const syncData$ = new rxjs_1.Subject();
        const updateDb = (data) => {
            this.dbSDK.updateDoc(this.dbName, taskData._id, data)
                .then(data => taskData._rev = data.rev)
                .catch(err => {
                logger_1.logger.error("Error while update doc for task", taskData._id, err.message);
            });
        };
        syncData$.pipe(operators_1.debounceTime(500))
            .subscribe((data) => {
            data._id = taskData._id;
            data._rev = taskData._rev;
            updateDb(data);
        }, error => {
            updateDb(taskData);
        }, () => {
            // complete task 
        });
        return syncData$;
    }
    getTaskObserver(queueCopy, syncFun) {
        const next = (data) => {
            queueCopy = data;
            const runningTaskRef = _.find(this.runningTasks, { _id: queueCopy._id });
            queueCopy.runTime = queueCopy.runTime + (Date.now() - runningTaskRef.startTime) / 1000;
            syncFun.next(queueCopy);
        };
        const error = (err) => {
            queueCopy.status = SystemQueueStatus.failed;
            queueCopy.failedCode = err.code;
            queueCopy.failedReason = err.message;
            queueCopy.isActive = false;
            const runningTaskRef = _.find(this.runningTasks, { _id: queueCopy._id });
            queueCopy.runTime = queueCopy.runTime + (Date.now() - runningTaskRef.startTime) / 1000;
            syncFun.error(queueCopy);
            _.remove(this.runningTasks, (job) => job._id === queueCopy._id);
            this.executeNextTask();
        };
        const complete = () => {
            queueCopy.isActive = false;
            queueCopy.status = SystemQueueStatus.completed;
            const runningTaskRef = _.find(this.runningTasks, { _id: queueCopy._id });
            queueCopy.runTime = queueCopy.runTime + (Date.now() - runningTaskRef.startTime) / 1000;
            syncFun.next(queueCopy);
            syncFun.complete();
            _.remove(this.runningTasks, (job) => job._id === queueCopy._id);
            this.executeNextTask();
        };
        return { next, error, complete };
    }
    remove(plugin, _id) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    query(plugin, query, sort) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    pause(plugin, _id) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    resume(plugin, _id) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    cancel(plugin, _id) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
    retry(plugin, _id) {
        return __awaiter(this, void 0, void 0, function* () {
        });
    }
};
__decorate([
    typescript_ioc_2.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], SystemQueue.prototype, "dbSDK", void 0);
SystemQueue = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [])
], SystemQueue);
exports.SystemQueue = SystemQueue;
var SystemQueueStatus;
(function (SystemQueueStatus) {
    SystemQueueStatus["reconcile"] = "reconcile";
    SystemQueueStatus["resume"] = "resume";
    SystemQueueStatus["inQueue"] = "inQueue";
    SystemQueueStatus["inProgress"] = "inProgress";
    SystemQueueStatus["pausing"] = "pausing";
    SystemQueueStatus["paused"] = "paused";
    SystemQueueStatus["canceling"] = "canceling";
    SystemQueueStatus["canceled"] = "canceled";
    SystemQueueStatus["completed"] = "completed";
    SystemQueueStatus["failed"] = "failed";
})(SystemQueueStatus = exports.SystemQueueStatus || (exports.SystemQueueStatus = {}));
var ConcurrencyLevel;
(function (ConcurrencyLevel) {
    ConcurrencyLevel[ConcurrencyLevel["app"] = 0] = "app";
    ConcurrencyLevel[ConcurrencyLevel["plugin"] = 1] = "plugin";
    ConcurrencyLevel[ConcurrencyLevel["task"] = 2] = "task";
})(ConcurrencyLevel = exports.ConcurrencyLevel || (exports.ConcurrencyLevel = {}));
