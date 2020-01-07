import FileSDK from "./../../sdks/FileSDK";
process.env.FILES_PATH = __dirname;

let fileSDK = new FileSDK("testplugindownload");
process.env.DATABASE_PATH = fileSDK.getAbsPath("database");

import DownloadManager, { reconciliation, STATUS } from "./DownloadManager";
import { EventManager } from "@project-sunbird/ext-framework-server/managers/EventManager";
import * as _ from "lodash";
let downloadManager;
const chai = require('chai'), spies = require('chai-spies');
chai.use(spies);
const spy = chai.spy.sandbox();
const expect = chai.expect;
import * as path from "path";

describe("DownloadManager", () => {
  before( async() => {
    await fileSDK.mkdir("database");
    downloadManager = new DownloadManager("testplugindownload");
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
    this.timeout(100000);
    downloadManager
      .download(
        {
          id: "do_112210971791319040141",
          url:
            "https://ekstep-public-dev.s3-ap-south-1.amazonaws.com/content/do_112210971791319040141/artifact/1490597285153_do_112210971791319040141.zip",
          size: 361
        },
        "ecars"
      )
      .then(downloadId => {
        expect(downloadId).to.be.string;
      });
    let flag = false;
    EventManager.subscribe(`testplugindownload:download:complete`, data => {
      expect(data.status).to.be.equal("COMPLETED");
      console.log(data.files)
      if (!_.isEmpty(_.find(data.files, { id: "do_112210971791319040141" }))) {
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
    this.timeout(100000);
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

  it("should throw error if doc not found for passed download id while pausing content", async () => {
    const dbSDK = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({}));
    try {
      await downloadManager.pause("123")
    } catch(err) {
      expect(dbSDK).to.have.been.called.with(downloadManager.dataBaseName, "123");
      expect(err.code).to.be.equal("DOC_NOT_FOUND")
      expect(err.status).to.be.equal(400)
    }
  })
  it("should throw error if no file in download list is greater than downloaded size while pausing content", async () => {
    const dbSDK = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({files: [{size: 20, downloaded: 20}]}));
    try {
      await downloadManager.pause("123")
    } catch(err) {
      expect(dbSDK).to.have.been.called.with(downloadManager.dataBaseName, "123");
      expect(err.code).to.be.equal("NO_FILES_IN_QUEUE")
      expect(err.status).to.be.equal(400)
    }
  })
  it("should throw error if no file is in queue in sui-downloader3 while pausing content", async () => {
    const dbSDK = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({_id: "123", files: [{ id: "234", size: 20, downloaded: 19}]}));
    const downloadManagerHelper = spy.on(downloadManager.downloadManagerHelper, 'cancel', data => false);
    try {
      await downloadManager.pause("123")
    } catch(err) {
      expect(dbSDK).to.have.been.called.with(downloadManager.dataBaseName, "123");
      expect(downloadManagerHelper).to.have.been.called.with("123_234");
      expect(err.code).to.be.equal("NO_FILES_IN_QUEUE")
      expect(err.status).to.be.equal(400)
    }
  })
  it("should return true if content is paused successfully", async () => {
    const dbSDKGetDoc = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({_id: "123", files: [{id: "234", size: 20, downloaded: 19}]}));
    const dbSDKUpdateDoc = spy.on(downloadManager.dbSDK, 'updateDoc', data => Promise.resolve(true));
    const downloadManagerHelper = spy.on(downloadManager.downloadManagerHelper, 'cancel', data => true);
    const res = await downloadManager.pause("123")
    expect(res).to.be.equal(true)
    expect(dbSDKGetDoc).to.have.been.called.with(downloadManager.dataBaseName, "123");
    expect(dbSDKUpdateDoc).to.have.been.called.with(downloadManager.dataBaseName, "123");
    expect(downloadManagerHelper).to.have.been.called.with("123_234");
  })
  it("should throw error if doc not found for passed download id while canceling content", async () => {
    const dbSDK = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({}));
    try {
      await downloadManager.cancel("123")
    } catch(err) {
      expect(dbSDK).to.have.been.called.with(downloadManager.dataBaseName, "123");
      expect(err.code).to.be.equal("DOC_NOT_FOUND")
      expect(err.status).to.be.equal(400)
    }
  })
  it("should throw error if no file in download list is greater than downloaded size while canceling content", async () => {
    const dbSDK = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({files: [{size: 20, downloaded: 20, path: "test", file: "123"}]}));
    try {
      await downloadManager.cancel("123")
    } catch(err) {
      console.log(err);
      expect(dbSDK).to.have.been.called.with(downloadManager.dataBaseName, "123");
      expect(err.code).to.be.equal("NO_FILES_IN_QUEUE")
      expect(err.status).to.be.equal(400)
    }
  })
  it("should throw error if no file in download list is greater than downloaded size or status is not paused while canceling content", async () => {
    const dbSDK = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({status: STATUS.InProgress, files: [{size: 20, downloaded: 20, path: "test", file: "123"}]}));
    try {
      await downloadManager.cancel("123")
    } catch(err) {
      console.log(err);
      expect(dbSDK).to.have.been.called.with(downloadManager.dataBaseName, "123");
      expect(err.code).to.be.equal("NO_FILES_IN_QUEUE")
      expect(err.status).to.be.equal(400)
    }
  })
  it("should throw error if no file is in queue in sui-downloader3 while canceling content", async () => {
    const dbSDK = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({status: STATUS.InProgress, _id: "123", files: [{ id: "234", size: 20, downloaded: 19}]}));
    const downloadManagerHelper = spy.on(downloadManager.downloadManagerHelper, 'cancel', data => false);
    try {
      await downloadManager.cancel("123")
    } catch(err) {
      expect(dbSDK).to.have.been.called.with(downloadManager.dataBaseName, "123");
      expect(downloadManagerHelper).to.have.been.called.with("123_234");
      expect(err.code).to.be.equal("NO_FILES_IN_QUEUE")
      expect(err.status).to.be.equal(400)
    }
  })
  it("should return true if content is canceled successfully by canceling download in sui-downloader3", async () => {
    const dbSDKGetDoc = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({_id: "123", files: [{id: "234", size: 20, downloaded: 19}]}));
    const dbSDKUpdateDoc = spy.on(downloadManager.dbSDK, 'updateDoc', data => Promise.resolve(true));
    const downloadManagerHelper = spy.on(downloadManager.downloadManagerHelper, 'cancel', data => true);
    const res = await downloadManager.cancel("123")
    expect(res).to.be.equal(true) // path: "test", file: "123"
    expect(dbSDKGetDoc).to.have.been.called.with(downloadManager.dataBaseName, "123");
    expect(dbSDKUpdateDoc).to.have.been.called.with(downloadManager.dataBaseName, "123");
    expect(downloadManagerHelper).to.have.been.called.with("123_234");
  })
  it("should return true if content is canceled successfully by canceling download in sui-downloader3 and deleting already downloaded content", async () => {
    const dbSDKGetDoc = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({_id: "123", files: [{id: "234", size: 20, downloaded: 19},
    {id: "345", size: 20, downloaded: 20, path: "test", file: "123"}]}));
    const dbSDKUpdateDoc = spy.on(downloadManager.dbSDK, 'updateDoc', data => Promise.resolve(true));
    const downloadManagerHelper = spy.on(downloadManager.downloadManagerHelper, 'cancel', data => true);
    const fileSDK = spy.on(downloadManager.fileSDK, 'remove', data => true);
    const res = await downloadManager.cancel("123")
    expect(res).to.be.equal(true);
    expect(dbSDKGetDoc).to.have.been.called.with(downloadManager.dataBaseName, "123");
    expect(dbSDKUpdateDoc).to.have.been.called.with(downloadManager.dataBaseName, "123");
    expect(downloadManagerHelper).to.have.been.called.with("123_234");
    expect(fileSDK).to.have.been.called.with(path.join("test", "123"));
  })
  it("should throw error if doc not found for passed download id while retrying download", async () => {
    const dbSDK = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({}));
    try {
      await downloadManager.retry("123")
    } catch(err) {
      expect(dbSDK).to.have.been.called.with(downloadManager.dataBaseName, "123");
      expect(err.code).to.be.equal("DOC_NOT_FOUND")
      expect(err.status).to.be.equal(400)
    }
  })
  it("should throw error if doc status is not failed retrying download", async () => {
    const dbSDK = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({status: STATUS.InProgress, _id: "123"}));
    try {
      await downloadManager.retry("123")
    } catch(err) {
      expect(dbSDK).to.have.been.called.with(downloadManager.dataBaseName, "123");
      expect(err.code).to.be.equal("INVALID_OPERATION")
      expect(err.status).to.be.equal(400)
    }
  })
  it("should call resume method while retying failed download and return true", async () => {
    const dbSDK = spy.on(downloadManager.dbSDK, 'getDoc', data => Promise.resolve({status: STATUS.Failed, _id: "123"}));
    const resumeMethod = spy.on(downloadManager, 'resume', data => true);
    const res = await downloadManager.retry("123");
    expect(res).to.be.equal(true);
    expect(dbSDK).to.have.been.called.with(downloadManager.dataBaseName, "123");
    expect(resumeMethod).to.have.been.called.with("123");
  })
  after(() => {});
  afterEach(async () => {
    spy.restore();
  })
});
