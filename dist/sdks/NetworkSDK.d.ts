export default class NetworkSDK {
    private internetStatus;
    private telemetryInstance;
    constructor();
    isInternetAvailable: (baseUrl?: string) => Promise<boolean>;
    private setInitialStatus;
    private setEventEmitter;
}
