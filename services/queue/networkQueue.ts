import { Queue, INetworkQueue } from './queue';
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
    // constructor(){
    //     super();
    // }

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

    public async update(docId: string, query: object) {
        return await this.updateQueue(docId, query);
    }

    public async get(query: object) {
        return await this.getByQuery(query);
    }

    async executeQueue() {
        try {
            let queueData: any = await this.get({
                selector: {
                    syncStatus: false,
                    type: 'NETWORK',
                },
                limit: 100
            });

            let networkStatus: boolean = await this.networkSDK.isInternetAvailable();
            if (!queueData || queueData.length === 0 || networkStatus === false) {
                return;
            }
            logger.info("Syncing network queue of size", queueData.length);

            for (const doc of queueData) {
                await this.syncToServer(doc.requestBody, doc.requestHeaderObj, doc.pathToApi)
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
                stacktrace: (
                    error.stack ||
                    error.stacktrace ||
                    error.message ||
                    ""
                ).toString()
            }
        };
        this.telemetryInstance.error(errorEvent);
    }
}

export interface IAdd {
    pathToApi: string;
    requestHeaderObj: {};
    requestBody: {};
}
