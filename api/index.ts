/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */

import { Singleton, Inject } from "typescript-ioc";
import { App } from "./../index";
import { PluginConfig } from "./../interfaces";
import { register } from "./../sdks/GlobalSDK";
import SettingSDK from "./../sdks/SettingSDK";
import FileSDK from "./../sdks/FileSDK";
import NetworkSDK from "./../sdks/NetworkSDK";
import DownloadManager from "./../managers/DownloadManager/DownloadManager";
import SystemSDK from "./../sdks/SystemSDK";
import TelemetrySDK from "./../sdks/TelemetrySDK";
import { UserSDK } from "./../sdks/UserSDK";
import { TicketSDK } from "./../sdks/TicketSDK";
import { SystemQueue, TaskExecuter, SystemQueueReq, SystemQueueQuery } from './../services/queue';
export { ITaskExecuter, SystemQueueQuery, ISystemQueue, SystemQueueReq, SystemQueueStatus } from "./../services/queue";
@Singleton
class ContainerAPI {
  @Inject userSDK : UserSDK;
  @Inject ticketSDK : TicketSDK;
  @Inject systemQueue: SystemQueue
  public async bootstrap() {
    await App.bootstrap();
  }

  public async register(pluginId: string, pluginInfo: PluginConfig) {
    await register(pluginId, pluginInfo);
  }

  // get the Setting SDK by plugin

  public getSettingSDKInstance(pluginId: string) {
    return new SettingSDK(pluginId);
  }

  // get file SDK by plugin

  public getFileSDKInstance(pluginId: string): FileSDK {
    return new FileSDK(pluginId);
  }

  // get the Network SDK

  public async getNetworkStatus(url?: string): Promise<boolean> {
    let networkSDK = new NetworkSDK();
    let status: boolean = await networkSDK.isInternetAvailable(url);
    return status;
  }

  // get the downloadManager Instance

  public getDownloadManagerInstance(pluginId: string): DownloadManager {
    return new DownloadManager(pluginId);
  }
  public getSystemSDKInstance(pluginId: string): SystemSDK {
    return new SystemSDK(pluginId);
  }

  public getTelemetrySDKInstance() {
    return new TelemetrySDK();
  }

  public getUserSdkInstance(){
    return this.userSDK;
  }
  public getTicketSdkInstance(){
    return this.ticketSDK;
  }
  public getSystemQueueInstance(pluginId: string): ISystemQueueInstance{
    const register = (type: string, taskExecuter: TaskExecuter) => {
      return this.systemQueue.register(pluginId, type, taskExecuter);
    }
    const add = (tasks: SystemQueueReq[] | SystemQueueReq) => {
      return this.systemQueue.add(pluginId, tasks);
    }
    const query = (query: SystemQueueQuery, sort?: any) => {
      return this.systemQueue.query(pluginId, query, sort);
    }
    const pause = (_id: string) => {
      return this.systemQueue.pause(pluginId, _id);
    }
    const resume = (_id: string) => {
      return this.systemQueue.resume(pluginId, _id);
    }
    const cancel = (_id: string) => {
      return this.systemQueue.cancel(pluginId, _id);
    }
    const retry = (_id: string) => {
      return this.systemQueue.retry(pluginId, _id);
    }
    return { register, add, query, pause, resume, cancel, retry }
  }
}
export interface ISystemQueueInstance {
  register(type: string, taskExecuter: TaskExecuter); 
  add(tasks: SystemQueueReq[] | SystemQueueReq);
  query(query: SystemQueueQuery, sort?: any);
  pause(_id: string); 
  resume(_id: string);
  cancel(_id: string);
  retry(_id: string);
}
export const containerAPI = new ContainerAPI();
