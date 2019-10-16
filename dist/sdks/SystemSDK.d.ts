export default class SystemSDK {
    private deviceId;
    constructor(pluginId?: string);
    getDeviceId(): Promise<string>;
    getDiskSpaceInfo(): void;
    getMemoryInfo(): void;
    getDeviceInfo(): void;
    getAll(): void;
}
