"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const _ = __importStar(require("lodash"));
const telemetrySDK = __importStar(require("@project-sunbird/telemetry-sdk"));
const SystemSDK_1 = __importDefault(require("./../../sdks/SystemSDK"));
class TelemetryHelper {
    /**
     * Creates an instance of TelemetryService.
     * @param {*} telemetryProvider
     * @memberof TelemetryService
     */
    constructor() {
        /**
         *
         *
         * @private
         * @type {Boolean}
         * @memberof TelemetryService
         */
        this.isInitialized = false;
        this.telemetryProvider = telemetrySDK;
        this.systemSDK = new SystemSDK_1.default();
    }
    /**
     *
     * Initializes the service
     * @param {ITelemetryContext} context
     * @memberof TelemetryService
     */
    init(context) {
        this.context = _.cloneDeep(context);
        this.telemetryProvider.initialize(this.context.config);
        this.isInitialized = true;
        console.log("Telemetry Service is Initialized!", this.context);
    }
    /**
     *
     *
     * @param {IStartEventInput} startEventInput
     * @memberof TelemetryService
     */
    start(startEventInput) {
        if (this.isInitialized) {
            const eventData = this.getEventData(startEventInput);
            this.telemetryProvider.start(this.context.config, eventData.options.object.id, eventData.options.object.ver, eventData.edata, eventData.options);
        }
    }
    /**
     *
     * service method to trigger impression event telemetry
     * @param {IImpressionEventInput} impressionEventInput
     * @memberof TelemetryService
     */
    impression(impressionEventInput) {
        if (this.isInitialized) {
            const eventData = this.getEventData(impressionEventInput);
            this.telemetryProvider.impression(eventData.edata, eventData.options);
        }
    }
    /**
     *
     * Logs 'interact' telemetry event
     * @param {IInteractEventInput} interactEventInput
     * @memberof TelemetryService
     */
    interact(interactEventInput) {
        if (this.isInitialized) {
            const eventData = this.getEventData(interactEventInput);
            this.telemetryProvider.interact(eventData.edata, eventData.options);
        }
    }
    /**
     * Logs 'share' telemetry event
     *
     * @param {IShareEventInput} shareEventInput
     * @memberof TelemetryService
     */
    share(shareEventInput) {
        if (this.isInitialized) {
            const eventData = this.getEventData(shareEventInput);
            this.telemetryProvider.share(eventData.edata, eventData.options);
        }
    }
    /**
     * Logs 'error' telemetry event
     *
     * @param {IErrorEventInput} errorEventInput
     * @memberof TelemetryService
     */
    error(errorEventInput) {
        if (this.isInitialized) {
            const eventData = this.getEventData(errorEventInput);
            this.telemetryProvider.error(eventData.edata, eventData.options);
        }
    }
    /**
     * Logs 'end' telemetry event
     *
     * @param {IEndEventInput} endEventInput
     * @memberof TelemetryService
     */
    end(endEventInput) {
        if (this.isInitialized) {
            const eventData = this.getEventData(endEventInput);
            this.telemetryProvider.end(eventData.edata, eventData.options);
        }
    }
    /**
     * Logs 'log' telemetry event
     *
     * @param {ILogEventInput} logEventInput
     * @memberof TelemetryService
     */
    log(logEventInput) {
        if (this.isInitialized) {
            const eventData = this.getEventData(logEventInput);
            this.telemetryProvider.log(eventData.edata, eventData.options);
        }
    }
    /**
     * Feedback 'feedback' telemetry event
     *
     * @param {IFeedBackEventInput} IFeedBackEventInput
     * @memberof TelemetryService
     */
    feedback(feedbackEventInput) {
        if (this.isInitialized) {
            const eventData = this.getEventData(feedbackEventInput);
            this.telemetryProvider.feedback(eventData.edata, eventData.options);
        }
    }
    /**
     * Audit 'audit' telemetry event
     *
     * @param {IAuditEventInput} IFeedBackEventInput
     * @memberof TelemetryService
     */
    audit(auditEventInput) {
        if (this.isInitialized) {
            const eventData = this.getEventData(auditEventInput);
            this.telemetryProvider.audit(eventData.edata, eventData.options);
        }
    }
    /**
     * Interrupt 'interrupt' telemetry event
     *
     * @param {IInterruptEvent} IInterruptEvent
     * @memberof TelemetryService
     */
    interrupt(interruptEventInput) {
        if (this.isInitialized) {
            const eventData = this.getEventData(interruptEventInput);
            this.telemetryProvider.interrupt(eventData.edata, eventData.options);
        }
    }
    /**
     *
     *
     * @private
     * @param {*} eventInput
     * @returns
     * @memberof TelemetryService
     */
    getEventData(eventInput) {
        const event = {
            edata: eventInput.edata,
            options: {
                context: this.getEventContext(eventInput),
                object: this.getEventObject(eventInput),
                tags: _.compact(this.context.userOrgDetails.organisationIds)
            }
        };
        return event;
    }
    /**
     *
     *
     * @private
     * @param {*} eventInput
     * @returns
     * @memberof TelemetryService
     */
    getEventObject(eventInput) {
        if (eventInput.object) {
            const eventObjectData = {
                id: eventInput.object.id || "",
                type: eventInput.object.type || "",
                ver: eventInput.object.ver || "",
                rollup: eventInput.object.rollup || {}
            };
            return eventObjectData;
        }
        else {
            // telemetry.min.js will take last sent object is not sent.
            return {};
        }
    }
    /**
     *
     *
     * @private
     * @param {*} eventInput
     * @returns
     * @memberof TelemetryService
     */
    getEventContext(eventInput) {
        const eventContextData = {
            channel: eventInput.edata.channel || this.context.config.channel,
            pdata: eventInput.edata.pdata || this.context.config.pdata,
            env: eventInput.context.env || this.context.config.env,
            sid: eventInput.sid || this.context.config.sid,
            uid: this.context.config.uid,
            cdata: eventInput.context.cdata || [],
            rollup: this.getRollUpData(this.context.userOrgDetails.organisationIds)
        };
        return eventContextData;
    }
    /**
     *
     *
     * @private
     * @param {Array<string>} [data=[]]
     * @returns
     * @memberof TelemetryService
     */
    getRollUpData(data = []) {
        const rollUp = {};
        data.forEach((element, index) => (rollUp["l" + (index + 1)] = element));
        return rollUp;
    }
}
exports.TelemetryHelper = TelemetryHelper;
