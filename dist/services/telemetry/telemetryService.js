"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const telemetry_helper_1 = require("./telemetry-helper");
class TelemetryService extends telemetry_helper_1.TelemetryHelper {
    constructor() {
        super();
        this.telemetryBatch = [];
        this.telemetryConfig = {};
    }
    init(config) {
        // const orgDetails = await this.databaseSdk.getDoc(
        //   "organization",
        //   process.env.CHANNEL
        // );
        // get mode from process env if standalone use machine id as did for client telemetry also
        this.telemetryConfig = config;
        const telemetryLibConfig = {
            userOrgDetails: {
                userId: "anonymous",
                rootOrgId: config.rootOrgId,
                organisationIds: [config.hashTagId]
            },
            config: {
                pdata: config.pdata,
                batchsize: config.batchSize,
                endpoint: "",
                apislug: "",
                sid: config.sid,
                channel: config.hashTagId,
                env: config.env,
                enableValidation: config.enableValidation,
                timeDiff: 0,
                runningEnv: config.runningEnv || "server",
                dispatcher: {
                    dispatch: this.dispatcher.bind(this)
                }
            }
        };
        super.init(telemetryLibConfig);
    }
    dispatcher(data) {
        this.telemetryBatch.push(data);
        if (this.telemetryBatch.length >= this.telemetryConfig.batchSize) {
            this.telemetryConfig.dispatcher(this.telemetryBatch.splice(0, this.telemetryBatch.length));
        }
    }
}
exports.TelemetryService = TelemetryService;
