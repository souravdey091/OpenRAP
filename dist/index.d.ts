import { TelemetryManager } from "./managers/TelemetryManager";
import { NetworkQueue } from './services/queue/networkQueue';
import DeviceSDK from "./sdks/DeviceSDK";
export declare class App {
    static networkQueue: NetworkQueue;
    static telemetryManager: TelemetryManager;
    static deviceSDK: DeviceSDK;
    static bootstrap(): Promise<void>;
}
