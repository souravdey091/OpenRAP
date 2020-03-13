import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
import { TelemetryExport } from './../services/telemetry/TelemetryExport';
import { Inject } from "typescript-ioc";
import SettingSDK from './SettingSDK';
import * as _ from "lodash";
import { EventManager } from "@project-sunbird/ext-framework-server/managers/EventManager";

export default class TelemetrySDK {
  @Inject private telemetryInstance: TelemetryInstance;
  @Inject private telemetryExport: TelemetryExport;
  @Inject private settingSDK: SettingSDK;

  getInstance() {
    return this.telemetryInstance;
  }

  send(events: any[]): Promise<any> {
    return this.telemetryInstance.send(events);
  }

  export(destPath: string, cb) {
    return this.telemetryExport.export(destPath, cb);
  }

  info(cb) {
    return this.telemetryExport.info(cb)
  }

  // : Promise<boolean | TelemetrySDKError>

  async setTelemetrySyncSetting(enable: boolean) {
    let dbData = await this.settingSDK.put('networkQueueInfo', {config: [{type: 'TELEMETRY', sync: enable}]});
    EventManager.emit(`networkQueueInfo`, {});
    return dbData;
    

    // try {
    //   const dbData = await this.settingSDK.get('networkQueueInfo');
    //   return dbData;
    // } catch (error) {
    //   return this.settingSDK.put('networkQueueInfo', {config: [{type: 'TELEMETRY', sync: enable}]});
    // }


  }

  async getTelemetrySyncSetting(): Promise<{} | { enable: boolean }> {
    try {
      const dbData: any = await this.settingSDK.get('networkQueueInfo');
      let mapData = _.find(dbData.config, {type: 'TELEMETRY'});
      if (_.get(mapData, 'sync') === undefined) {
        return Promise.resolve({ enable: true });
      }
      return Promise.resolve({ enable: _.get(mapData, 'sync') });
    } catch (error) {
      return Promise.resolve({ enable: true });
    }
  }
}

export interface TelemetrySDKError {
  code: string;
  status: number;
  message: string;
}
