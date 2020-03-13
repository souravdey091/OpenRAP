import * as si from "systeminformation";
export default class SystemSDK {
    private deviceId;
    private settingSDK;
    constructor(pluginId?: string);
    getDeviceId(): Promise<any>;
    private getAddress;
    getHardDiskInfo(): Promise<{
        totalHarddisk: number;
        availableHarddisk: number;
        fsSize: void | si.Systeminformation.FsSizeData[];
    }>;
    getMemoryInfo(): Promise<{
        totalMemory: number;
        availableMemory: number;
    }>;
    getCpuLoad(): Promise<void | si.Systeminformation.CurrentLoadData>;
    getNetworkInfo(): Promise<void | si.Systeminformation.NetworkInterfacesData[]>;
    getDeviceInfo(): Promise<{
        id: string;
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
