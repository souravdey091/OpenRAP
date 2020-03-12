import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
import { TelemetryExport } from './../services/telemetry/TelemetryExport';
import { Inject } from "typescript-ioc";
import SettingSDK from './SettingSDK'

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

  setTelemetrySyncSetting(enable: boolean): Promise<boolean | TelemetrySDKError> {
    if (enable === undefined || typeof enable !== "boolean") {
      throw {
        code: "BAD_REQUEST",
        status: 400,
        message: "Enable key should exist and it should be boolean"
      }
    }
    return this.settingSDK.put('telemetrySyncSetting', { enable: enable, updatedOn: Date.now() });
  }

  async getTelemetrySyncSetting(): Promise<{} | { enable: boolean }> {
    try {
      return await this.settingSDK.get('telemetrySyncSetting');
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
