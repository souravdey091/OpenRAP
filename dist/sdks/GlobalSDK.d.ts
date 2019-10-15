import { PluginConfig } from "./../interfaces";
export declare const register: (pluginId: string, pluginConfig: object) => Promise<boolean>;
export declare const get: (pluginId: string) => Promise<PluginConfig>;
export declare const list: () => Promise<PluginConfig[]>;
