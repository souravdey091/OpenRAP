import { expect } from "chai";
import { containerAPI } from "./index";
import SettingSDK from "./../sdks/SettingSDK";
import FileSDK from "./../sdks/FileSDK";
import DownloadManager from "./../managers/DownloadManager/DownloadManager";

describe("ContainerAPI", () => {
  it("should call bootstrap method", done => {
    containerAPI.bootstrap().then(() => {
      done();
    });
  });

  it("should get setting SDK instance", () => {
    let settingSDK = containerAPI.getSettingSDKInstance("test");
    expect(settingSDK).to.be.instanceOf(SettingSDK);
  });

  it("should get file SDK instance", () => {
    let fileSDK = containerAPI.getFileSDKInstance("sunbird-test-plugin");
    expect(fileSDK).to.be.instanceOf(FileSDK);
  });

  it("should get download manager instance", () => {
    let downloadManager = containerAPI.getDownloadManagerInstance(
      "sunbird-test-plugin"
    );
    expect(downloadManager).to.be.instanceOf(DownloadManager);
  });
});
