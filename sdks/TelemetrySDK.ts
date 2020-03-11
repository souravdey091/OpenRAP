import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";
import { TelemetryExport } from './../services/telemetry/TelemetryExport';
import { Inject } from "typescript-ioc";
import SettingSDK from './SettingSDK'

export default class TelemetrySDK {
  @Inject private telemetryInstance: TelemetryInstance;
  @Inject private telemetryExport: TelemetryExport;
  @Inject private settingSDK: SettingSDK;
  private cb;

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

  setIsTelemetrySyncToServer(syncToServer: boolean, cb) {
    this.cb = cb;
    try {
      let respData = this.settingSDK.put('isTelemetrySyncToServer', { syncToServer: syncToServer, updatedOn: Date.now() });
      this.cb(null, respData);
    } catch (error) {
      this.cb(error);
    }
  }

  async getIsTelemetrySyncToServer(cb) {
    this.cb = cb;
    try {
      this.cb(null, await this.settingSDK.get('isTelemetrySyncToServer'));
    } catch (error) {
      this.cb(null, { syncToServer: true });
    }
  }
}
