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
export enum NETWORK_SUBTYPE {
    Telemetry = "TELEMETRY"
};
export enum PRIORITY {
    first = 1
};
const maxRunningJobs = 1;

@Singleton
export class NetworkQueue extends Queue {
    @Inject networkSDK: NetworkSDK;
    @Inject
    private telemetryInstance: TelemetryInstance;
    queueInProgress: boolean = false;
    private runningJobs = [];

    init() {
        this.execute();
        EventManager.subscribe("network:available", () => {
            this.execute();
        });
    }

    add(doc: IAdd, docId?: string) {
        let date = Date.now();
        let data = {
            ...doc,
            _id: docId || uuid.v4(),
            createdOn: date,
            updatedOn: date,
            type: QUEUE_TYPE.Network,
            priority: PRIORITY.first,
            syncStatus: false,
        };

        let resp = this.enQueue(data);
        this.execute();
        return resp;
    }

    async execute() {
        // If internet is not available return
        let networkStatus: boolean = await this.networkSDK.isInternetAvailable();
        if (!networkStatus) {
            logger.warn("Network syncing failed as internet is not available");
        }

        try {
            this.queueInProgress = true;
            let queueData: any = await this.getByQuery({
                selector: {
                    syncStatus: false,
                    type: QUEUE_TYPE.Network,
                },
                limit: 100
            });

            // If no data is available to sync return
            if (!queueData || queueData.length === 0) {
                return;
            }

            logger.info("Syncing network queue of size", queueData.length);
            let queuedJobIndex = 0;
            while (maxRunningJobs > this.runningJobs.length && queueData[queuedJobIndex]) {
                logger.info("Went inside while loop", queueData[queuedJobIndex], this.runningJobs.length);
                const jobRunning: any = _.find(this.runningJobs, { id: queueData[queuedJobIndex]._id }); // duplicate check
                if (!jobRunning) {
                    this.runningJobs.push({
                        _id: queueData[queuedJobIndex]._id
                    });
                    let buffer = Buffer.from(queueData[queuedJobIndex].requestBody.data);
                    let apiRequestBody = JSON.parse(buffer.toString('utf8'));
                    await this.makeHTTPCall(apiRequestBody, queueData[queuedJobIndex].requestHeaderObj, queueData[queuedJobIndex].pathToApi)
                        .then(async data => {
                            logger.info(`Network Queue synced for id = ${queueData[queuedJobIndex]._id}`);
                            await this.updateQueue(queueData[queuedJobIndex]._id, { syncStatus: true, updatedOn: Date.now() });
                            _.remove(this.runningJobs, (job) => job._id === queueData[queuedJobIndex]._id);
                            this.execute();
                        })
                        .catch(error => {
                            _.remove(this.runningJobs, (job) => job._id === queueData[queuedJobIndex]._id);
                            logger.error(`Error while syncing to Network Queue for id = ${queueData[queuedJobIndex]._id}`, error.message);
                            this.logTelemetryError(error);
                        });
                }
                queuedJobIndex++;
            }
        } catch (error) {
            this.queueInProgress = false;
            logger.error(`while running the Network queue sync job`, error);
            this.logTelemetryError(error);
        }
    }

    async makeHTTPCall(headers: object, body: object, pathToApi: string) {
        return await HTTPService.post(
            process.env.APP_BASE_URL + pathToApi,
            body,
            { headers: headers }
        ).toPromise();
    }

    logTelemetryError(error: any) {
        const errorEvent = {
            context: {
                env: "networkQueue"
            },
            edata: {
                err: "SERVER_ERROR",
                errtype: "SYSTEM",
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
    requestBody: Buffer;
}
