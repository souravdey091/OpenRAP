import { TelemetryHelper } from "./telemetry-helper";
export declare class TelemetryService extends TelemetryHelper {
    telemetryBatch: any[];
    telemetryConfig: any;
    constructor();
    init(config: any): void;
    dispatcher(data: any): void;
}
