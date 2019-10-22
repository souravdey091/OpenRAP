export default class NetworkSDK {
    private internetStatus;
    constructor();
    isInternetAvailable: (baseUrl?: string) => Promise<boolean>;
    private setInitialStatus;
    private setEventEmitter;
}
