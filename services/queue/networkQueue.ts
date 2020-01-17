import { Queue, QUEUE_TYPE } from './queue';
import { IQuery } from './IQueue';
import { logger } from "@project-sunbird/ext-framework-server/logger";
import { Inject, Singleton } from "typescript-ioc";
import { HTTPService } from "@project-sunbird/ext-framework-server/services";
import { TelemetryInstance } from './../telemetry/telemetryInstance';
import * as _ from "lodash";
import uuid = require("uuid");
import NetworkSDK from "./../../sdks/NetworkSDK";
import { EventManager } from "@project-sunbird/ext-framework-server/managers/EventManager";
import { retry, mergeMap, catchError } from 'rxjs/operators';
import { of, throwError } from 'rxjs';
export enum NETWORK_SUBTYPE {
    Telemetry = "TELEMETRY"
};
export enum PRIORITY { first = 1 };
const successResponseCode = ['success', 'ok'];

@Singleton
export class NetworkQueue extends Queue {
    @Inject private networkSDK: NetworkSDK;
    @Inject private telemetryInstance: TelemetryInstance;
    private concurrency: number = 10;
    private queueList = [];
    private running: number = 0;
    private retryCount: number = 5;
    private queueInProgress = false;

    add(doc: IAdd, docId?: string) {
        let date = Date.now();
        let data = {
            ...doc,
            _id: docId || uuid.v4(),
            createdOn: date,
            updatedOn: date,
            type: QUEUE_TYPE.Network,
            priority: PRIORITY.first,
        };
        this.read();
        let resp = this.enQueue(data);
        return resp;
    }

    async read() {
        if (this.running !== 0 || this.queueInProgress) {
            logger.warn("Job is in progress");
            return;
        }
        this.queueInProgress = true;

        // If internet is not available return
        let networkStatus: boolean = await this.networkSDK.isInternetAvailable();
        if (!networkStatus) {
            this.queueInProgress = false;
            logger.warn("Network syncing failed as internet is not available");
            return;
        }

        try {
            this.queueList = await this.getByQuery({
                selector: {
                    type: QUEUE_TYPE.Network,
                },
                limit: this.concurrency
            });

            // If no data is available to sync return
            if (!this.queueList || this.queueList.length === 0) {
                this.queueInProgress = false;
                logger.warn("No network queue available to sync");
                return;
            }
            logger.info(`Calling execute method to sync network queue of size = ${this.queueList.length}`);
            this.execute();
            this.queueInProgress = false;
        } catch (error) {
            logger.error(`DB error while fetching network queue data = ${error}`);
            this.logTelemetryError(error, "DB_ERROR");
        }
    }

    execute() {
        while (this.running < this.concurrency && this.queueList.length) {
            logger.info("Went inside while loop");
            const currentQueue = this.queueList.shift();
            let requestBody = _.get(currentQueue, 'requestHeaderObj.Content-Encoding') === 'gzip' ? Buffer.from(currentQueue.requestBody.data) : currentQueue.requestBody;
            this.makeHTTPCall(currentQueue.requestHeaderObj, requestBody, currentQueue.pathToApi)
                .then(async resp => {
                    // For new API if success comes with new responseCode, add responseCode to successResponseCode
                    if (_.includes(successResponseCode, _.toLower(_.get(resp, 'data.responseCode')))) {
                        logger.info(`Network Queue synced for id = ${currentQueue._id}`);
                        await this.deQueue(currentQueue._id).catch(error => {
                            logger.info(`Received error deleting id = ${currentQueue._id}`);
                        });
                        EventManager.emit(`${currentQueue.type}_${currentQueue.subType}:processed`, currentQueue);
                        this.running--;
                    } else {
                        logger.warn(`Unable to sync network queue with id = ${currentQueue._id}`);
                        await this.deQueue(currentQueue._id).catch(error => { 
                            logger.info(`Received error deleting id = ${currentQueue._id}`);
                        });
                        this.running--;
                    }
                })
                .catch(async error => {
                    logger.error(`Error while syncing to Network Queue for id = ${currentQueue._id}`, error.message);
                    this.logTelemetryError(error);
                    await this.deQueue(currentQueue._id).catch(error => {
                        logger.info(`Received error in catch for deleting id = ${currentQueue._id}`);
                    });
                    let dbData = {
                        pathToApi: _.get(currentQueue, 'pathToApi'),
                        requestHeaderObj: _.get(currentQueue, 'requestHeaderObj'),
                        requestBody: _.get(currentQueue, 'requestBody'),
                        subType: _.get(currentQueue, 'subType'),
                        size: _.get(currentQueue, 'size'),
                    };
                    this.running--;
                    await this.add(dbData);
                });
            this.running++;
        }
    }

    async makeHTTPCall(headers: object, body: object, pathToApi: string) {
        return await HTTPService.post(
            process.env.APP_BASE_URL + pathToApi,
            body,
            { headers: headers }
        ).pipe(mergeMap((data) => {
            return of(data);
        }), catchError((error) => {
            if (_.get(error, 'response.status') >= 500 && _.get(error, 'response.status') < 599) {
                return throwError(error);
            } else {
                return of(error);
            }
        }), retry(this.retryCount)).toPromise();
    }

    logTelemetryError(error: any, errType: string = "SERVER_ERROR") {
        const errorEvent = {
            context: {
                env: "networkQueue"
            },
            edata: {
                err: errType === "DB_ERROR" ? "DB_ERROR" : "SERVER_ERROR",
                errtype: errType === "DB_ERROR" ? "DATABASE" : "SYSTEM",
                stacktrace: (error.stack || error.message || "").toString()
            }
        };
        this.telemetryInstance.error(errorEvent);
    }
}

export interface IAdd {
    subType: string;
    pathToApi: string;
    requestHeaderObj: object;
    requestBody: any;
}
