export default class SystemSDK {
    private deviceId;
    constructor(pluginId?: string);
    getDeviceId(): Promise<string>;
    getHardDiskInfo(): void;
    getMemoryInfo(): void;
    getDeviceInfo(): void;
}
