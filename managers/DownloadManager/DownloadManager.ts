/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */

import { DownloadObject, DownloadFile } from "./../../interfaces";
import { Inject } from "typescript-ioc";
import * as _ from "lodash";
import uuid4 from "uuid/v4";
import * as path from "path";
import { DataBaseSDK } from "./../../sdks/DataBaseSDK";
import FileSDK from "./../../sdks/FileSDK";
import { DownloadManagerHelper } from "./DownloadManagerHelper";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import { EventManager } from "@project-sunbird/ext-framework-server/managers/EventManager";
import * as Url from "url";
import { TelemetryInstance } from "./../../services/telemetry/telemetryInstance";

/*
 * Below are the status for the download manager with different status
 */
export enum STATUS {
  Submitted = "SUBMITTED",
  InProgress = "INPROGRESS",
  Completed = "COMPLETED",
  Failed = "FAILED",
  Cancelled = "CANCELLED",
  EventEmitted = "EVENTEMITTED"
}

export enum STATUS_MESSAGE {
  Submitted = "Request is submitted. It will process soon.",
  InProgress = "Downloading is in progress.",
  Completed = "Downloaded  successfully.",
  Failed = "Download failed."
}

export default class DownloadManager {
  @Inject
  private downloadManagerHelper: DownloadManagerHelper;

  @Inject
  private telemetryInstance: TelemetryInstance;

  pluginId: string;

  @Inject
  private dbSDK: DataBaseSDK;

  private fileSDK: FileSDK;

  private dataBaseName = "download_queue";

  constructor(pluginId: string) {
    this.pluginId = pluginId;
    this.fileSDK = new FileSDK(pluginId);

    // listen to network events to pause and start the downloads

    EventManager.subscribe("network:available", () => {
      this.downloadManagerHelper.resumeDownload();
    });

    EventManager.subscribe("network:disconnected", () => {
      this.downloadManagerHelper.pauseAll(true);
    });
  }
  /*
   * Method to queue the download of a file
   * @param files - The file urls to download
   * @param location - Path to download the file
   * @return downloadId - The download id reference
   */
  download = async (
    files: DownloadFile | DownloadFile[],
    location: string
  ): Promise<string> => {
    /* TODO: need to handle the error cases like 
        1. when same file used to download in single file or multiple files
        2. when the it fails to add to the queue
        **/

    //ensure dest location exists
    await this.fileSDK.mkdir(location);
    let docId = uuid4();
    // insert the download request with data to database
    if (_.isArray(files)) {
      let totalSize = _.reduce(
        files,
        (sum, file) => {
          return sum + file.size;
        },
        0
      );
      let doc = {
        pluginId: this.pluginId,
        status: STATUS.Submitted,
        statusMsg: STATUS_MESSAGE.Submitted,
        createdOn: Date.now(),
        updatedOn: Date.now(),
        stats: {
          totalFiles: (files as DownloadFile[]).length,
          downloadedFiles: 0,
          totalSize: totalSize,
          downloadedSize: 0
        },
        files: []
      };
      for (const file of files as DownloadFile[]) {
        let fileId = (file as DownloadFile).id;
        let downloadUrl = (file as DownloadFile).url;
        let fileName = `${fileId}${path.extname(
          Url.parse(downloadUrl).pathname
        )}`;
        let downloadObj = {
          id: fileId,
          file: fileName,
          source: downloadUrl,
          path: this.fileSDK.getAbsPath(location),
          size: file.size,
          downloaded: 0 // Downloaded until now
        };
        doc.files.push(downloadObj);

        // push the request to download queue
        let locations = {
          url: downloadUrl,
          savePath: this.fileSDK.getAbsPath(path.join(location, fileName))
        };

        // while adding to queue we will prefix with docId if same content is requested again we will download it again
        this.downloadManagerHelper.queueDownload(
          `${docId}_${fileId}`,
          this.pluginId,
          locations,
          this.downloadManagerHelper.downloadObserver(fileId, docId)
        );

        let telemetryEvent = {
          context: {
            env: "downloadManager"
          },
          object: {
            id: fileId,
            type: "content"
          },
          edata: {
            state: STATUS.Submitted,
            props: [
              "pluginId",
              "stats",
              "status",
              "updatedOn",
              "createdOn",
              "files"
            ]
          }
        };
        this.telemetryInstance.audit(telemetryEvent);
      }

      await this.dbSDK.insertDoc(this.dataBaseName, doc, docId);

      return Promise.resolve(docId);
    } else {
      let {
        id: fileId,
        url: downloadUrl,
        size: totalSize
      } = files as DownloadFile;
      let fileName = `${fileId}${path.extname(
        Url.parse(downloadUrl).pathname
      )}`;
      let doc = {
        pluginId: this.pluginId,
        status: STATUS.Submitted,
        statusMsg: "Request is submitted. It will process soon",
        createdOn: Date.now(),
        updatedOn: Date.now(),
        stats: {
          totalFiles: 1,
          downloadedFiles: 0,
          totalSize: totalSize,
          downloadedSize: 0
        },
        files: [
          {
            id: fileId,
            file: fileName,
            source: downloadUrl,
            path: this.fileSDK.getAbsPath(location),
            size: totalSize,
            downloaded: 0 // Downloaded until now
          }
        ]
      };

      await this.dbSDK.insertDoc(this.dataBaseName, doc, docId);

      // push the request to download queue
      let locations = {
        url: downloadUrl,
        savePath: this.fileSDK.getAbsPath(path.join(location, fileName))
      };
      let telemetryEvent = {
        context: {
          env: "downloadManager"
        },
        object: {
          id: fileId,
          type: "content"
        },
        edata: {
          state: STATUS.Submitted,
          props: ["stats", "status", "updatedOn", "createdOn", "files"]
        }
      };
      this.telemetryInstance.audit(telemetryEvent);
      // while adding to queue we will prefix with docId if same content is requested again we will download it again
      this.downloadManagerHelper.queueDownload(
        `${docId}_${fileId}`,
        this.pluginId,
        locations,
        this.downloadManagerHelper.downloadObserver(fileId, docId)
      );
      return Promise.resolve(docId);
    }
  };

  /*
   * Method to get the status of the download
   * @param downloadId String
   * @return Download object
   */
  get = async (downloadId: string): Promise<DownloadObject> => {
    // Read status of the request with downloadId and return downloadObject
    let downloadObject;
    downloadObject = await this.dbSDK.getDoc(this.dataBaseName, downloadId);
    delete downloadObject.pluginId;
    delete downloadObject.statusMsg;
    delete downloadObject._rev;
    downloadObject.id = downloadObject["_id"];
    delete downloadObject["_id"];
    return Promise.resolve(downloadObject);
  };

  /*
   * Method to pause the download
   * @param downloadId String
   */
  pause = (downloadId: string) => {
    //TODO: need to implement
    //return this.downloadManagerHelper.pause(downloadId);
  };

  /*
   * Method to cancel the download
   * @param downloadId String
   */
  cancel = async (downloadId: string): Promise<boolean> => {
    //TODO: need to implement
    //await this.dbSDK.updateDoc(this.dataBaseName, downloadId, { status: STATUS.Cancelled });
    //return Promise.resolve(this.downloadManagerHelper.cancel(downloadId));
    this.downloadManagerHelper.cancel(downloadId);
    return Promise.resolve(true);
  };

  /*
   * Method to pause all the downloads for the given plugin
   * @param downloadId String
   */
  pauseAll = (): void => {
    //TODO: need to implement completed this is for test cases
    // this.downloadManagerHelper.pauseAll();
  };

  /*
   * Method to cancel all the downloads for the given plugin
   * @param downloadId String
   */
  cancelAll = async (): Promise<boolean> => {
    // get all the downloadIds which are not completed// call killDownload with all the downloadIds on the queue and return the promise
    //TODO: need to implement
    // let flag = this.downloadManagerHelper.cancelAll()
    // // get the docs which are in status submitted and in progress
    // let { docs } = await this.dbSDK.find(this.dataBaseName, {
    //     selector: {
    //         status: { "$in": [STATUS.Submitted, STATUS.InProgress] }
    //     }
    // })

    // // change the status of the docs to cancelled
    // if (docs.length) {
    //     let updatedDocs = _.map(docs, doc => {
    //         doc.status = STATUS.Cancelled;
    //         return doc;
    //     })
    //     await this.dbSDK.bulkDocs(this.dataBaseName, updatedDocs)
    // }
    return Promise.resolve(true);
  };

  // this is for test cases only
  downloadQueue() {
    return this.downloadManagerHelper.taskQueue();
  }

  /*
   * Method to list the download queue based on the status
   * @param status String - The status of the download - Submitted, Complete, InProgress, Failed. Blank option will return all status
   * @return Array - Array of download objects
   */
  list = async (status?: Array<string>): Promise<DownloadObject[]> => {
    // get the list of items from database if status is provided otherwise get all the status
    let downloadObjects: DownloadObject[] = [];
    let selector = {
      selector: {},
      fields: ["status", "createdOn", "updatedOn", "stats", "files", "_id"]
    };
    if (status) {
      selector.selector = {
        status: {
          $in: status
        }
      };
    }
    let { docs } = await this.dbSDK.find(this.dataBaseName, selector);
    downloadObjects = _.map(docs, doc => {
      doc.id = doc["_id"];
      delete doc["_id"];
      return doc;
    });
    return Promise.resolve(downloadObjects);
  };

  async resume(downloadId: string) {
    // get the data from db with download id
    let doc = await this.dbSDK
      .getDoc(this.dataBaseName, downloadId)
      .catch(err => {
        logger.error(
          `while getting the doc to resume doc_id ${downloadId}, err: ${err}`
        );
      });
    let addedToQueue = false;
    if (!_.isEmpty(doc)) {
      for (let file of doc.files) {
        if (file.size > file.downloaded) {
          // push the request to download queue
          let locations = {
            url: file.source,
            savePath: path.join(file.path, file.file)
          };
          // while adding to queue we will prefix with docId if same content is requested again we will download it again
          try {
            let downloadQueue = this.downloadQueue();
            let key = `${doc._id}_${file.id}`;
            if (!_.find(downloadQueue, { key: key })) {
              addedToQueue = true;
              this.downloadManagerHelper.queueDownload(
                key,
                doc.pluginId,
                locations,
                this.downloadManagerHelper.downloadObserver(file.id, doc._id)
              );
            }
          } catch (error) {
            logger.error(
              `while adding to queue doc ${JSON.stringify(
                doc
              )}, error : ${error}`
            );
          }
        }
      }
      if (addedToQueue) {
        await this.dbSDK.updateDoc(this.dataBaseName, doc._id, {
          updatedOn: Date.now()
        });
      }
    }
  }
}

/*
     This method will ensure that when the service is started/restarted updates the queue using data from download_queue database
     */
export const reconciliation = async () => {
  // Get the data from database where status is completed
  let dbSDK = new DataBaseSDK();

  let telemetryInstance = new TelemetryInstance();
  let dataBaseName = "download_queue";

  let completedData = await dbSDK
    .find(dataBaseName, {
      selector: {
        status: STATUS.Completed
      }
    })
    .catch(err => {
      logger.error(
        `reconciliation database call to get the completed docs ${err}`
      );
    });
  if (_.get(completedData, "docs") && !_.isEmpty(completedData.docs)) {
    for (let doc of completedData.docs) {
      let eventDoc = _.cloneDeep(doc);
      eventDoc.id = doc._id;
      delete eventDoc._id;
      delete eventDoc._rev;
      delete eventDoc.pluginId;
      delete eventDoc.statusMsg;
      EventManager.emit(`${doc.pluginId}:download:complete`, eventDoc);
      await dbSDK.updateDoc(dataBaseName, doc._id, {
        status: STATUS.EventEmitted
      });
    }
  }

  let pendingDownloads = await dbSDK
    .find(dataBaseName, {
      selector: {
        status: {
          $in: [STATUS.Submitted, STATUS.InProgress]
        }
      }
    })
    .catch(err => {
      logger.error(
        "reconciliation database call to get the completed docs ",
        err
      );
    });
  if (_.get(pendingDownloads, "docs") && !_.isEmpty(pendingDownloads.docs)) {
    for (let doc of pendingDownloads.docs) {
      let downloadManager = new DownloadManager(doc.pluginId);
      await downloadManager.resume(doc._id).catch(err => {
        logger.error(
          `while adding the pending items to download queue ${JSON.stringify(
            doc
          )} err: ${err}`
        );
      });
    }
  }
  let telemetryEvent = {
    context: {
      env: "downloadManager"
    },
    edata: {
      level: "INFO",
      type: "OTHER",
      message: "Download manager reconciliation on starting the app",
      params: [
        {
          PENDING: _.get(pendingDownloads, "docs")
            ? _.get(pendingDownloads, "docs").length
            : 0
        },
        {
          COMPLETED: _.get(completedData, "docs")
            ? _.get(completedData, "docs").length
            : 0
        }
      ]
    }
  };

  telemetryInstance.log(telemetryEvent);
};
