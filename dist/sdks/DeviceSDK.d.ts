export default class DeviceSDK {
    private settingSDK;
    private systemSDK;
    private databaseSdk;
    private config;
    private apiKey;
    initialize(config: IConfig): void;
    register(): Promise<void>;
    getToken(deviceId?: string): Promise<string>;
}
export interface IConfig {
    key: string;
}
