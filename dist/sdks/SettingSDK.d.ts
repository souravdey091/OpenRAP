export default class SettingSDK {
    pluginId?: string;
    private dbSDK;
    constructor(pluginId?: string);
    put: (key: string, value: object) => Promise<boolean>;
    get: (key: string) => Promise<object>;
}
