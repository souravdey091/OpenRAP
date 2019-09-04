/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */

import { Singleton } from 'typescript-ioc';
import { bootstrap } from './../index'
import { PluginConfig } from '../interfaces';
import { register } from '../sdks/GlobalSDK';
import SettingSDK from '../sdks/SettingSDK';
import FileSDK from '../sdks/FileSDK';
import NetworkSDK from '../sdks/NetworkSDK';
import DownloadManager from '../managers/DownloadManager/DownloadManager';
import SystemSDK from '../sdks/SystemSDK';
@Singleton
class ContainerAPI {

    public async bootstrap() {
        await bootstrap();
    }

    public async register(pluginId: string, pluginInfo: PluginConfig) {
        await register(pluginId, pluginInfo);
    }

    // get the Setting SDK by plugin

    public getSettingSDKInstance(pluginId: string) {
        return new SettingSDK(pluginId)
    }

    // get file SDK by plugin

    public getFileSDKInstance(pluginId: string): FileSDK {
        return new FileSDK(pluginId)

    }

    // get the Network SDK 

    public async getNetworkStatus(url: string): Promise<boolean> {
        let networkSDK = new NetworkSDK();
        let status: boolean = await networkSDK.isInternetAvailable(url)
        return status;
    }

    // get the downloadManager Instance

    public getDownloadManagerInstance(pluginId: string): DownloadManager {
        return new DownloadManager(pluginId);
    }
    public getSystemSDKInstance(pluginId: string): SystemSDK {
        return new SystemSDK(pluginId)
    }


}

export const containerAPI = new ContainerAPI();