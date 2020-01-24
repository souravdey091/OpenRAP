import { ISystemQueue } from './IQueue';
import { Observer } from "rxjs";
export { ISystemQueue } from './IQueue';
export declare class SystemQueue {
    private dbSDK;
    private dbName;
    private registeredTasks;
    private runningTasks;
    private lockTaskExecuter;
    private config;
    constructor();
    /**
     * method to initializes system queue.
     * This method should be called after all plugin and app are initialized
     * @param config
     */
    initialize(config: Config): Promise<void>;
    /**
     * method to track progress of task.
     * this method will stop the task for which progress is not updated for configured time
     * and pick next task in queue
     */
    trackTaskProgress(): void;
    /**
     * method to register task with taskExecuters.
     * @param plugin
     * @param type
     * @param taskExecuter
     * @param supportedActions
     */
    register(plugin: string, type: string, taskExecuter: TaskExecuter, supportedActions?: string[]): void;
    /**
     * method to add task to queue.
     * In order for SystemQueue to execute a task, executer for the same should already be registered by plugin.
     * @param plugin
     * @param tasks
     */
    add(plugin: string, tasks: QueueReq[] | QueueReq): Promise<string[] | SystemQueueError>;
    private executeNextTask;
    private getTaskSyncFun;
    private getTaskObserver;
    private remove;
    query(plugin: string, query: SystemQueueQuery, sort: any): Promise<void>;
    pause(plugin: string, _id: string): Promise<void>;
    resume(plugin: string, _id: string): Promise<void>;
    cancel(plugin: string, _id: string): Promise<void>;
    retry(plugin: string, _id: string): Promise<void>;
}
export interface ITaskExecuter {
    start(ISystemQueue: ISystemQueue, observer: Observer<ISystemQueue>): Promise<boolean | SystemQueueError>;
    status(): ISystemQueue;
    pause?(): Promise<boolean | SystemQueueError>;
    resume?(ISystemQueue: any): Promise<boolean | SystemQueueError>;
    cancel?(): Promise<boolean | SystemQueueError>;
    retry?(ISystemQueue: any): Promise<boolean | SystemQueueError>;
}
export interface TaskExecuter {
    new (): ITaskExecuter;
}
export interface QueueReq {
    type: ISystemQueue['type'];
    name: ISystemQueue['name'];
    group: ISystemQueue['group'];
    data: ISystemQueue['data'];
    indexField: ISystemQueue['indexField'];
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
export declare enum SystemQueueStatus {
    reconcile = "reconcile",
    resume = "resume",
    inQueue = "inQueue",
    inProgress = "inProgress",
    pausing = "pausing",
    paused = "paused",
    canceling = "canceling",
    canceled = "canceled",
    completed = "completed",
    failed = "failed"
}
export declare enum ConcurrencyLevel {
    app = 0,
    plugin = 1,
    task = 2
}
export interface Config {
    concurrency: number;
    concurrencyLevel: ConcurrencyLevel;
}
export interface RegisteredTasks {
    plugin: string;
    type: string;
    taskExecuter: TaskExecuter;
    supportedActions: any;
}
