import { Singleton } from "typescript-ioc";
const GetMac = require("getmac");
const crypto = require("crypto");
import { logger } from "@project-sunbird/ext-framework-server/logger";
@Singleton
export default class SystemSDK {
  private deviceId: string;
  constructor(pluginId?: string) {}

  getDeviceId(): Promise<string> {
    if (this.deviceId) return Promise.resolve(this.deviceId);
    return new Promise(resolve => {
      GetMac.getMac((err, macAddress) => {
        if (err) {
          logger.error(`Error while getting deviceId ${err}`);
        }
        this.deviceId = crypto
          .createHash("sha256")
          .update(macAddress)
          .digest("hex");
        resolve(this.deviceId);
      });
    });
  }

  getHardDiskInfo() {}

  getMemoryInfo() {}

  getDeviceInfo() {}
}
