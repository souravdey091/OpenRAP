import { TelemetryService } from "./telemetryService";
export declare class TelemetryInstance extends TelemetryService {
    private databaseSdk;
    private telemetryEvents;
    sessionId: string;
    constructor();
    send(events: any): Promise<any>;
    private syncToDB;
}
