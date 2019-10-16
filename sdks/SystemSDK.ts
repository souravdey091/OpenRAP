import { Singleton } from "typescript-ioc";
const GetMac = require("getmac");
import { hash } from "./../utils";
import { logger } from "@project-sunbird/ext-framework-server/logger";
@Singleton
export default class SystemSDK {
  private deviceId: string;
  constructor(pluginId?: string) {}

  getDeviceId(): Promise<string> {
    if (this.deviceId) return Promise.resolve(this.deviceId);
    return new Promise(resolve => {
      GetMac.getMac((err, macAddress) => {
        logger.error(`Error while getting deviceId ${err}`);
        this.deviceId = hash(macAddress);
        resolve(this.deviceId);
      });
    });
  }

  getDiskSpaceInfo() {}

  getMemoryInfo() {}

  getDeviceInfo() {}

  getAll() {}
}
