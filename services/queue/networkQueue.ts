import { Queue, QUEUE_TYPE } from './queue';
import { IQuery } from './IQueue';
import { logger } from "@project-sunbird/ext-framework-server/logger";
import { Inject, Singleton } from "typescript-ioc";
import { HTTPService } from "@project-sunbird/ext-framework-server/services";
import { TelemetryInstance } from './../telemetry/telemetryInstance';
import * as _ from "lodash";
import uuid = require("uuid");
import NetworkSDK from "./../../sdks/NetworkSDK";
export enum NETWORK_SUBTYPE {
    Telemetry = "TELEMETRY"
};

@Singleton
export class NetworkQueue extends Queue {
    @Inject
    private networkSDK: NetworkSDK;
    @Inject
    private telemetryInstance: TelemetryInstance;
    queueInProgress: boolean = false;

    init(interval: number) {
        setInterval(() => this.executeQueue(), interval);
    }

    add(doc: IAdd, docId?: string) {
        let data = {
            ...doc,
            _id: docId || uuid.v4(),
            createdOn: Date.now(),
            updatedOn: Date.now(),
            type: QUEUE_TYPE.Network,
            priority: 1,
            syncStatus: false,
        };
        return this.enQueue(data);
    }

    update(docId: string, query: object) {
        return this.updateQueue(docId, query);
    }

    get(query: IQuery) {
        return this.getByQuery(query);
    }

    async executeQueue() {
        // If syncing is in progress return
        if (this.queueInProgress) { return; }

        // If internet is not available return
        let networkStatus: boolean = await this.networkSDK.isInternetAvailable();
        if (!networkStatus) {
            logger.error("Network syncing failed as internet is not available");
            return;
        }
        try {
            this.queueInProgress = true;
            let queueData: any = await this.get({
                selector: {
                    syncStatus: false,
                    type: QUEUE_TYPE.Network,
                },
                limit: 100
            });

            // If no data is available to sync return
            if (!queueData || queueData.length === 0) {
                this.queueInProgress = false;
                return;
            }
            logger.info("Syncing network queue of size", queueData.length);

            for (const doc of queueData) {
                let buffer = Buffer.from(doc.requestBody.data);
                let apiRequestBody = JSON.parse(buffer.toString('utf8'));
                await this.syncToServer(apiRequestBody, doc.requestHeaderObj, doc.pathToApi)
                    .then(async data => {
                        logger.info(`Network Queue synced for id = ${doc._id}`);
                        await this.update(doc._id, { syncStatus: true });
                        this.queueInProgress = false;
                        this.executeQueue();
                    })
                    .catch(error => {
                        this.queueInProgress = false;
                        logger.error(`Error while syncing to Network Queue for id = ${doc._id}`, error.message);
                        this.logTelemetryError(error);
                    });
            }
        } catch (error) {
            this.queueInProgress = false;
            logger.error(`while running the Network queue sync job`, error);
            this.logTelemetryError(error);
        }
    }

    async syncToServer(headers: object, body: object, pathToApi: string) {
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
