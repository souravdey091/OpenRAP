import { TelemetrySyncManager } from "./managers/TelemetrySyncManager";
import { NetworkQueue } from './services/queue/networkQueue';
export declare class App {
    static networkQueue: NetworkQueue;
    static telemetrySyncManager: TelemetrySyncManager;
    static bootstrap(): Promise<void>;
}
