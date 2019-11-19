import { expect } from "chai";
import DownloadManager, { reconciliation } from "./DownloadManager";
import FileSDK from "./../../sdks/FileSDK";
import { EventManager } from "@project-sunbird/ext-framework-server/managers/EventManager";
import * as _ from "lodash";

let downloadManager = new DownloadManager("testplugindownload");
let fileSDK = new FileSDK("testplugindownload");

describe("DownloadManager", () => {
  before(async () => {
    process.env.DATABASE_PATH = fileSDK.getAbsPath("");
  });

  it("should download multiple files successfully", function(done) {
    this.timeout(10000);
    this.downloadId = "";
    downloadManager
      .download(
        [
          {
            id: "do_312589002481041408120510",
            url:
              "https://ntpproductionall.blob.core.windows.net/ntp-content-production/ecar_files/do_312589002481041408120510/aarthik-vikaas-kii-smjh_1554523454637_do_312589002481041408120510_2.0_spine.ecar",
            size: 11786
          },
          {
            id: "do_312588883252060160117745",
            url:
              "https://ntpproductionall.blob.core.windows.net/ntp-content-production/ecar_files/do_312588883252060160117745/raindrops_1554477690491_do_312588883252060160117745_2.0_spine.ecar",
            size: 267849
          }
        ],
        "ecars"
      )
      .then(downloadId => {
        this.downloadId = downloadId;
        expect(downloadId).to.be.string;
      });
    EventManager.subscribe(`testplugindownload:download:complete`, data => {
      expect(data.status).to.be.equal("COMPLETED");
      if (data.id === this.downloadId) {
        done();
      }
    });
  });

  it("should download single file successfully", function(done) {
    this.timeout(10000);
    downloadManager
      .download(
        {
          id: "10MB_FILE",
          url: "https://sample-videos.com/zip/10mb.zip",
          size: 10503575
        },
        "ecars"
      )
      .then(downloadId => {
        expect(downloadId).to.be.string;
      });
    let flag = false;
    EventManager.subscribe(`testplugindownload:download:complete`, data => {
      expect(data.status).to.be.equal("COMPLETED");
      if (!_.isEmpty(_.find(data.files, { id: "10MB_FILE" }))) {
        flag = true;
      }
    });
    setTimeout(() => {
      if (flag) done();
    }, 9000);
  });

  it("should get the downloadObjects ", function(done) {
    downloadManager.list().then(downloadObjects => {
      expect(downloadObjects.length > 0).to.be.true;
      done();
    });
  });

  it("should get the downloadObjects with EVENTEMITTED status", function(done) {
    downloadManager.list(["EVENTEMITTED"]).then(downloadObjects => {
      let flag = true;
      downloadObjects.forEach(d => {
        if (!(d.status === "EVENTEMITTED")) flag = false;
      });
      expect(flag).to.be.true;
      done();
    });
  });

  it("should get the downloadObject", function(done) {
    downloadManager
      .list(["EVENTEMITTED"])
      .then(downloadObjects => {
        return downloadManager.get(downloadObjects[0]["id"]);
      })
      .then(data => {
        expect(data.status === "EVENTEMITTED").to.be.true;
        done();
      });
  });

  it("should reconciliation after service restart", function(done) {
    // make a item to completed and add two item to queue each with inprogress and submitted status
    this.timeout(10000);
    downloadManager
      .download(
        [
          {
            id: "do_3125888832520601601177451",
            url:
              "https://ntpproductionall.blob.core.windows.net/ntp-content-production/ecar_files/do_312588883252060160117745/raindrops_1554477690491_do_312588883252060160117745_2.0_spine.ecar",
            size: 267849
          },
          {
            id: "do_3125890024810414081205101",
            url:
              "https://ntpproductionall.blob.core.windows.net/ntp-content-production/ecar_files/do_312589002481041408120510/aarthik-vikaas-kii-smjh_1554523454637_do_312589002481041408120510_2.0_spine.ecar",
            size: 11786
          }
        ],
        "ecars"
      )
      .then(downloadId => {
        expect(downloadId).to.be.string;
      })
      .then(() => {
        for (let t of downloadManager.downloadQueue()) {
          downloadManager.cancel(t.key);
        }
        setTimeout(() => {
          return reconciliation();
        }, 500);
      })
      .catch(err => {
        console.error("Error while running reconciliation test case", err);
        done();
      });

    let interval = setInterval(() => {
      let t = downloadManager.downloadQueue();
      if (_.isEmpty(t)) {
        clearInterval(interval);
        done();
      }
    }, 1000);
  });

  after(() => {});
});
