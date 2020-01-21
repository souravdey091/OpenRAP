import { TelemetryManager } from "./managers/TelemetryManager";
import { NetworkQueue } from './services/queue/networkQueue';
export declare class App {
    static networkQueue: NetworkQueue;
    static telemetryManager: TelemetryManager;
    static bootstrap(): Promise<void>;
}
