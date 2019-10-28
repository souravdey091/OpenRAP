import { IStartEventInput, IImpressionEventInput, IInteractEventInput, IShareEventInput, IErrorEventInput, IEndEventInput, ILogEventInput, ITelemetryContext, IFeedBackEventInput, IAuditEventInput, IInterruptEventInput } from "./ITelemetry";
export declare class TelemetryHelper {
    /**
     *
     *
     * @private
     * @type {ITelemetryContext}
     * @memberof TelemetryService
     */
    private context;
    /**
     *
     *
     * @private
     * @type {*}
     * @memberof TelemetryService
     */
    private telemetryProvider;
    /**
     *
     *
     * @private
     * @type {Boolean}
     * @memberof TelemetryService
     */
    private isInitialized;
    private systemSDK;
    /**
     * Creates an instance of TelemetryService.
     * @param {*} telemetryProvider
     * @memberof TelemetryService
     */
    constructor();
    /**
     *
     * Initializes the service
     * @param {ITelemetryContext} context
     * @memberof TelemetryService
     */
    init(context: ITelemetryContext): void;
    /**
     *
     *
     * @param {IStartEventInput} startEventInput
     * @memberof TelemetryService
     */
    start(startEventInput: IStartEventInput): void;
    /**
     *
     * service method to trigger impression event telemetry
     * @param {IImpressionEventInput} impressionEventInput
     * @memberof TelemetryService
     */
    impression(impressionEventInput: IImpressionEventInput): void;
    /**
     *
     * Logs 'interact' telemetry event
     * @param {IInteractEventInput} interactEventInput
     * @memberof TelemetryService
     */
    interact(interactEventInput: IInteractEventInput): void;
    /**
     * Logs 'share' telemetry event
     *
     * @param {IShareEventInput} shareEventInput
     * @memberof TelemetryService
     */
    share(shareEventInput: IShareEventInput): void;
    /**
     * Logs 'error' telemetry event
     *
     * @param {IErrorEventInput} errorEventInput
     * @memberof TelemetryService
     */
    error(errorEventInput: IErrorEventInput): void;
    /**
     * Logs 'end' telemetry event
     *
     * @param {IEndEventInput} endEventInput
     * @memberof TelemetryService
     */
    end(endEventInput: IEndEventInput): void;
    /**
     * Logs 'log' telemetry event
     *
     * @param {ILogEventInput} logEventInput
     * @memberof TelemetryService
     */
    log(logEventInput: ILogEventInput): void;
    /**
     * Feedback 'feedback' telemetry event
     *
     * @param {IFeedBackEventInput} IFeedBackEventInput
     * @memberof TelemetryService
     */
    feedback(feedbackEventInput: IFeedBackEventInput): void;
    /**
     * Audit 'audit' telemetry event
     *
     * @param {IAuditEventInput} IFeedBackEventInput
     * @memberof TelemetryService
     */
    audit(auditEventInput: IAuditEventInput): void;
    /**
     * Interrupt 'interrupt' telemetry event
     *
     * @param {IInterruptEvent} IInterruptEvent
     * @memberof TelemetryService
     */
    interrupt(interruptEventInput: IInterruptEventInput): void;
    /**
     *
     *
     * @private
     * @param {*} eventInput
     * @returns
     * @memberof TelemetryService
     */
    private getEventData;
    /**
     *
     *
     * @private
     * @param {*} eventInput
     * @returns
     * @memberof TelemetryService
     */
    private getEventObject;
    /**
     *
     *
     * @private
     * @param {*} eventInput
     * @returns
     * @memberof TelemetryService
     */
    private getEventContext;
    /**
     *
     *
     * @private
     * @param {Array<string>} [data=[]]
     * @returns
     * @memberof TelemetryService
     */
    getRollUpData(data?: Array<string>): {};
}
