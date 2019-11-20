/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
import { PluginConfig } from "./../interfaces";
import SettingSDK from "./../sdks/SettingSDK";
import FileSDK from "./../sdks/FileSDK";
import DownloadManager from "./../managers/DownloadManager/DownloadManager";
import SystemSDK from "./../sdks/SystemSDK";
import TelemetrySDK from "./../sdks/TelemetrySDK";
import { UserSDK } from "./../sdks/UserSDK";
declare class ContainerAPI {
    userSDK: UserSDK;
    bootstrap(): Promise<void>;
    register(pluginId: string, pluginInfo: PluginConfig): Promise<void>;
    getSettingSDKInstance(pluginId: string): SettingSDK;
    getFileSDKInstance(pluginId: string): FileSDK;
    getNetworkStatus(url?: string): Promise<boolean>;
    getDownloadManagerInstance(pluginId: string): DownloadManager;
    getSystemSDKInstance(pluginId: string): SystemSDK;
    getTelemetrySDKInstance(): TelemetrySDK;
    getUserSdkInstance(): UserSDK;
}
export declare const containerAPI: ContainerAPI;
export {};
