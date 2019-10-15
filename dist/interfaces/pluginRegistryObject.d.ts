export interface PluginRegistryObject {
    id: string;
    config: {
        pluginVer: string;
        apiToken: string;
        apiBaseURL: string;
        apiTokenRefreshFn: Function;
    };
}
