/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
import { PluginConfig } from "./../interfaces";
import SettingSDK from "./../sdks/SettingSDK";
import FileSDK from "./../sdks/FileSDK";
import DownloadManager from "./../managers/DownloadManager/DownloadManager";
import SystemSDK from "./../sdks/SystemSDK";
import TelemetrySDK from "./../sdks/TelemetrySDK";
import { UserSDK } from "./../sdks/UserSDK";
import { TicketSDK } from "./../sdks/TicketSDK";
import { SystemQueue, TaskExecuter, SystemQueueReq, SystemQueueQuery } from './../services/queue';
export { ITaskExecuter, SystemQueueQuery, ISystemQueue, SystemQueueReq, SystemQueueStatus } from "./../services/queue";
declare class ContainerAPI {
    userSDK: UserSDK;
    ticketSDK: TicketSDK;
    systemQueue: SystemQueue;
    bootstrap(): Promise<void>;
    register(pluginId: string, pluginInfo: PluginConfig): Promise<void>;
    getSettingSDKInstance(pluginId: string): SettingSDK;
    getFileSDKInstance(pluginId: string): FileSDK;
    getNetworkStatus(url?: string): Promise<boolean>;
    getDownloadManagerInstance(pluginId: string): DownloadManager;
    getSystemSDKInstance(pluginId: string): SystemSDK;
    getTelemetrySDKInstance(): TelemetrySDK;
    getUserSdkInstance(): UserSDK;
    getTicketSdkInstance(): TicketSDK;
    getSystemQueueInstance(pluginId: string): ISystemQueueInstance;
}
export interface ISystemQueueInstance {
    register(type: string, taskExecuter: TaskExecuter): any;
    add(tasks: SystemQueueReq[] | SystemQueueReq): any;
    query(query: SystemQueueQuery, sort?: any): any;
    pause(_id: string): any;
    resume(_id: string): any;
    cancel(_id: string): any;
    retry(_id: string): any;
}
export declare const containerAPI: ContainerAPI;
