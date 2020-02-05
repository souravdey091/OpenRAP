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
    /**
     * method to initializes system queue.
     * This method should be called after all plugin and app are initialized
     * @param config
     */
    initialize(config?: any): Promise<void>;
    /**
     * method to track progress of task.
     * this method will stop the task for which progress is not updated for configured time
     * and pick next task in queue
     */
    private trackTaskProgress;
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
    add(plugin: string, tasks: SystemQueueReq[] | SystemQueueReq): Promise<string[] | SystemQueueError>;
    private executeNextTask;
    private getTaskSyncFun;
    private getTaskObserver;
    query(plugin: string, query: SystemQueueQuery, sort?: any): any;
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
export interface SystemQueueReq {
    type: ISystemQueue['type'];
    group?: ISystemQueue['group'];
    metaData: ISystemQueue['metaData'];
    name: ISystemQueue['name'];
}
export interface SystemQueueError {
    code: string;
    status: number;
    message: string;
}
export interface SystemQueueQuery {
    _id?: ISystemQueue['_id'] | {
        $in: ISystemQueue['_id'][];
    };
    type?: ISystemQueue['type'] | {
        $in: ISystemQueue['type'][];
    };
    group?: ISystemQueue['group'];
    name?: ISystemQueue['name'] | {
        $in: ISystemQueue['name'][];
    };
    isActive?: ISystemQueue['isActive'];
    createdOn?: ISystemQueue['createdOn'] | {
        $gt: ISystemQueue['createdOn'];
    };
    updatedOn?: ISystemQueue['updatedOn'] | {
        $gt: ISystemQueue['updatedOn'];
    };
}
export interface RegisteredTasks {
    plugin: string;
    type: string;
    taskExecuter: TaskExecuter;
    supportedActions: any;
}
