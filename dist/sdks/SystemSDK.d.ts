export default class SystemSDK {
    private deviceId;
    constructor(pluginId?: string);
    getDeviceId(): Promise<string>;
    getHardDiskInfo(): Promise<{
        totalHarddisk: number;
        availableHarddisk: number;
    }>;
    getMemoryInfo(): Promise<{
        totalMemory: number;
        availableMemory: number;
    }>;
    getDeviceInfo(): Promise<{
        platform: string;
        distro: string;
        osVersion: string;
        servicePack: string;
        arch: string;
        cores: number;
        cpuManufacturer: string;
        cpuBrand: string;
        cpuSpeed: string;
        cpuLoad: number;
        systemTime: number;
        hasBattery: boolean;
        displayResolution: string;
        appVersion: string;
        appId: string;
        totalMemory: number;
        availableMemory: number;
        totalHarddisk: number;
        availableHarddisk: number;
    }>;
}
