import { Queue } from './queue';
import { logger } from "@project-sunbird/ext-framework-server/logger";
import { Inject, Singleton } from "typescript-ioc";
import { HTTPService } from "@project-sunbird/ext-framework-server/services";
import { TelemetryInstance } from './../telemetry/telemetryInstance';
import * as _ from "lodash";
import uuid = require("uuid");
import NetworkSDK from "./../../sdks/NetworkSDK";

@Singleton
export class NetworkQueue extends Queue {
    @Inject
    private networkSDK: NetworkSDK;
    @Inject
    private telemetryInstance: TelemetryInstance;

    public add(doc: IAdd) {
        let data = {
            ...doc,
            _id: uuid.v4(),
            createdOn: Date.now(),
            updatedOn: Date.now(),
            type: 'NETWORK',
            priority: 1,
            syncStatus: false,
        };
        return this.enQueue(data);
    }

    public update(docId: string, query: object) {
        return this.updateQueue(docId, query);
    }

    public get(query: object) {
        return this.getByQuery(query);
    }

    async executeQueue() {
        try {
            let networkStatus: boolean = await this.networkSDK.isInternetAvailable();
            if (!networkStatus) {
                logger.error("Network syncing failed as internet is not available");
                return;
            }

            let queueData: any = await this.get({
                selector: {
                    syncStatus: false,
                    type: 'NETWORK',
                },
                limit: 100
            });
            
            if (!queueData || queueData.length === 0) {
                return;
            }
            logger.info("Syncing network queue of size", queueData.length);

            for (const doc of queueData) {
                let buffer = Buffer.from( doc.requestBody.data);
                let apiRequestBody = JSON.parse(buffer.toString('utf8'));
                await this.syncToServer(apiRequestBody, doc.requestHeaderObj, doc.pathToApi)
                    .then(data => {
                        logger.info( `Network Queue synced for id = ${doc._id}`);
                        return this.update(doc._id, { syncStatus: true });
                    })
                    .catch(error => {
                        logger.error( `Error while syncing to Network Queue for id = ${doc._id}`, error.message );
                        this.logTelemetryError(error);
                    });
            }
        } catch (error) {
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
