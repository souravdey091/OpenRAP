import { Singleton } from "typescript-ioc";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import { DataBaseSDK } from "../../sdks/DataBaseSDK";
import { ISystemQueue } from './IQueue';
import { logger } from "@project-sunbird/ext-framework-server/logger";
import uuid = require("uuid");
import { Subject, Observer } from "rxjs";
import { debounceTime } from "rxjs/operators";
export { ISystemQueue } from './IQueue';

@Singleton 
export class SystemQueue {
  @Inject private dbSDK: DataBaseSDK;
  private dbName = 'system_queue';
  private registeredTasks: { [task: string]: RegisteredTasks } = {};
  private runningTasks: IRunningTasks[] =  [];
  private lockTaskExecuter = false;
  private config = { // setting default config
    concurrency: 1,
    concurrencyLevel: ConcurrencyLevel.task // runs one task at a time for each type of task per plugin
  };
  constructor() {}
  /**
   * method to initializes system queue.
   * This method should be called after all plugin and app are initialized
   * @param config 
   */
  public async initialize(config: Config) {
    // this.config = config; TODO: support configurable concurrency
    const {docs} = await this.dbSDK.find(this.dbName, { selector: { status: SystemQueueStatus.inProgress} })
    .catch((err) => {
      logger.log("reconcile error while fetching inProgress content from DB", err.message);
      return { docs: [] };
    });
    logger.info("length of inProgress jobs found while reconcile", docs.length);
    if (docs.length) { // reconcile
      const updateQuery: ISystemQueue[] = _.map(docs, (job: ISystemQueue) => {
        job.status = SystemQueueStatus.reconcile;
        return job;
      });
      await this.dbSDK.bulkDocs(this.dbName, updateQuery)
        .catch((err) => logger.log("reconcile error while updating status to DB", err.message));
    }
    this.executeNextTask();
    setInterval(this.trackTaskProgress, 1000)
  }
  /**
   * method to track progress of task.
   * this method will stop the task for which progress is not updated for configured time
   * and pick next task in queue
   */
  trackTaskProgress(){
    //TODO: implement progress track method
  }
  /**
   * method to register task with taskExecuters.
   * @param plugin 
   * @param type 
   * @param taskExecuter 
   * @param supportedActions 
   */
  public register(plugin: string, type: string, taskExecuter: TaskExecuter, supportedActions?: string[]){
    if(!plugin || !type || !taskExecuter){
      logger.error('Task was not registered because of missing mandatory fields', plugin, type, taskExecuter);
      return;
    }
    if(this.registeredTasks[`${plugin}_${type}`]){
      logger.warn('SystemQueue is overriding already registered Task for', `${plugin} ${type}`, 'with new handler', taskExecuter);
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
  public async add(plugin: string, tasks: QueueReq[] | QueueReq): Promise<string[] | SystemQueueError> {
    if(_.isEmpty(tasks)){
      throw {
        code: "TASK_DATA_MISSING",
        status: 400,
        message: "Task data is missing or empty"
      }
    }
    tasks = _.isArray(tasks) ? tasks : [tasks]
    const queueData: ISystemQueue[] = tasks.map(task => ({
      ...task,
      _id: uuid(),
      createdOn: Date.now(),
      updatedOn: Date.now(),
      status: SystemQueueStatus.inQueue,
      progress: 0,
      plugin,
      priority: 1,
      runTime: 0,
      isActive: true,
    }));
    await this.dbSDK.bulkDocs(this.dbName, queueData)
    .catch((err) => logger.error("SystemQueue, Error while adding task in db", err.message));
    this.executeNextTask();
    return queueData.map(({_id}) => _id);
  }
  private async executeNextTask(){
    if(this.lockTaskExecuter){ // prevent picking of same task more than once(for handling race condition)
      return;
    }
    try {
      // TODO: should support all configs, currently only supports task concurrency
      this.lockTaskExecuter = true;
      const fetchQuery: { plugin: string, type: string }[] = [];
      let groupedRunningTask: { [task: string]: IRunningTasks[] } = _.groupBy(this.runningTasks, (task) => `${task.plugin}_${task.type}`)
      _.forIn(this.registeredTasks, (value, key) => {
        if(_.get(groupedRunningTask[key], 'length') < this.config.concurrencyLevel){
          fetchQuery.push({plugin: value.plugin, type: value.type});
        }
      });
      if(!fetchQuery.length){
        return;
      }
      const selector = { // TODO: should limit task query at plugin/type level
        status: { $in: [SystemQueueStatus.inQueue, SystemQueueStatus.resume] }, // maybe retry
        plugin: { $in: fetchQuery.map(data => data.plugin) },
        type: { $in: fetchQuery.map(data => data.type) }
      }
      const { docs } = await this.dbSDK.find(this.dbName, { selector: selector, sort: ["createdOn"] })
      .catch((err) => {
        logger.error("Error while fetching queued jobs in pickNextTask", err.message);
        return { docs: [] };
      });
      groupedRunningTask = _.groupBy(this.runningTasks, (task) => `${task.plugin}_${task.type}`);
      let queuedTaskIndex = 0;
      while (docs[queuedTaskIndex]) {
        const task: ISystemQueue = docs[queuedTaskIndex];
        const taskExecuter: TaskExecuter = _.get(this.registeredTasks[`${task.plugin}_${task.type}`], 'taskExecuter');
        if(taskExecuter && _.get(groupedRunningTask[`${task.plugin}_${task.type}`], 'length') < this.config.concurrencyLevel){
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
          groupedRunningTask[`${task.plugin}_${task.type}`].push(runningTaskRef)
        } else if (!taskExecuter) {
          // TODO: fail all task which doesn't have task Executers
          logger.error('TaskExecuter not found for task', task.plugin, task.type);
        }
        queuedTaskIndex++;
      }
    } catch(err) {
      logger.error("Error while executing task", err.message);
    } finally {
      this.lockTaskExecuter = false;
    }
  }
  private getTaskSyncFun(taskData: ISystemQueue): Subject<ISystemQueue> {
    const syncData$ = new Subject<ISystemQueue>();
    const updateDb = (data) => {
      this.dbSDK.updateDoc(this.dbName, taskData._id, data)
      .then(data => taskData._rev = data.rev)
      .catch(err => {
        logger.error("Error while update doc for task", taskData._id, err.message);
      });
    }
    syncData$.pipe(debounceTime(500))
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
  private getTaskObserver(queueCopy: ISystemQueue, syncFun: Subject<ISystemQueue>): Observer<ISystemQueue> {
    const next = (data: ISystemQueue) => {
      queueCopy = data;
      const runningTaskRef = _.find(this.runningTasks, {_id: queueCopy._id});
      queueCopy.runTime = queueCopy.runTime + (Date.now() - runningTaskRef.startTime)/1000;
      syncFun.next(queueCopy);
    };
    const error = (err: SystemQueueError) => {
      queueCopy.status = SystemQueueStatus.failed;
      queueCopy.failedCode = err.code;
      queueCopy.failedReason = err.message;
      queueCopy.isActive = false;
      const runningTaskRef = _.find(this.runningTasks, {_id: queueCopy._id});
      queueCopy.runTime = queueCopy.runTime + (Date.now() - runningTaskRef.startTime)/1000;
      syncFun.error(queueCopy);
      _.remove(this.runningTasks, (job) => job._id === queueCopy._id);
      this.executeNextTask();
    };
    const complete = () => {
      queueCopy.isActive = false;
      queueCopy.status = SystemQueueStatus.completed;
      const runningTaskRef = _.find(this.runningTasks, {_id: queueCopy._id});
      queueCopy.runTime = queueCopy.runTime + (Date.now() - runningTaskRef.startTime)/1000;
      syncFun.next(queueCopy);
      syncFun.complete();
      _.remove(this.runningTasks, (job) => job._id === queueCopy._id);
      this.executeNextTask();
    };
    return { next, error, complete };
  }
  private async remove(plugin: string, _id: string){ // not needed, should always use cancel
  }
  public async query(plugin: string, query: SystemQueueQuery, sort: any){
  }
  public async pause(plugin: string, _id: string){
  }
  public async resume(plugin: string, _id: string){
  }
  public async cancel(plugin: string, _id: string){
  }
  public async retry(plugin: string, _id: string){
  }
  //TODO: support custom actions
}

interface IRunningTasks {
  _id: ISystemQueue['_id'];
  type: ISystemQueue['type'];
  plugin: ISystemQueue['plugin'];
  startTime: number;
  lastKnowProgress: number;
  lastKnowProgressUpdatedTime: number;
  taskExecuterRef: ITaskExecuter;
  syncFunc: any;
}

export interface ITaskExecuter {
  start(ISystemQueue: ISystemQueue, observer: Observer<ISystemQueue>): Promise<boolean | SystemQueueError>;
  status(): ISystemQueue;
  pause?(): Promise<boolean | SystemQueueError>;
  resume?(ISystemQueue): Promise<boolean | SystemQueueError>;
  cancel?(): Promise<boolean | SystemQueueError>;
  retry?(ISystemQueue): Promise<boolean | SystemQueueError>;
}
export interface TaskExecuter {
  new(): ITaskExecuter;
}

export interface QueueReq {
  type: ISystemQueue['type'];
  name: ISystemQueue['name'];
  group: ISystemQueue['group']; // ex: content_manager, telemetry etc
  data: ISystemQueue['data']; // any data required for 
  indexField: ISystemQueue['indexField']; // ex: ecar path for import, content identifier for download/delete
}

export interface SystemQueueError {
  code: string;
  status: number;
  message: string;
}

export interface SystemQueueQuery {
  _id?: ISystemQueue['_id'][];
  type?: ISystemQueue['type'][];
  group?: ISystemQueue['group'];
  indexField?: ISystemQueue['indexField'][];
}
export enum SystemQueueStatus {
  reconcile = "reconcile",
  resume = "resume",
  inQueue = "inQueue",
  inProgress = "inProgress",
  pausing = "pausing",
  paused = "paused",
  canceling = "canceling",
  canceled = "canceled",
  completed = "completed",
  failed = "failed",
}

export enum ConcurrencyLevel {
  app,
  plugin,
  task
}
export interface Config {
  concurrency: number;
  concurrencyLevel: ConcurrencyLevel
}
export interface RegisteredTasks {
  plugin: string;
  type: string;
  taskExecuter: TaskExecuter;
  supportedActions: any;
}