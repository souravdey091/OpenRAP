export default class DeviceSDK {
    private settingSDK;
    private systemSDK;
    private databaseSdk;
    private masterKey;
    initialize(masterKey: string): void;
    deviceRegistry(): Promise<void>;
    getToken(deviceId: string): Promise<any>;
}
