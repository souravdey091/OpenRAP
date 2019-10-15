export default class SystemSDK {
    private deviceId;
    constructor(pluginId?: string);
    getDeviceId(): any;
    getDiskSpaceInfo(): void;
    getMemoryInfo(): void;
    getDeviceInfo(): void;
    getAll(): void;
}
