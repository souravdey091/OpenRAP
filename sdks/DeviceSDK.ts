import { Inject, Singleton } from "typescript-ioc";
import SettingSDK from './SettingSDK';
import * as _ from "lodash";
import { logger } from "@project-sunbird/logger";
import SystemSDK from "./SystemSDK";
import { HTTPService } from "@project-sunbird/ext-framework-server/services";
import uuid = require("uuid");
import axios from "axios";
import jwt from "jsonwebtoken";
import { DataBaseSDK } from "./DataBaseSDK";

@Singleton
export default class DeviceSDK {
    @Inject private settingSDK: SettingSDK;
    @Inject private systemSDK: SystemSDK;
    @Inject private databaseSdk: DataBaseSDK;
    private masterKey: string;

    initialize(masterKey: string) {
        this.masterKey = masterKey;
    }

    async deviceRegistry() {
        var interval = setInterval(async () => {
            let deviceId = await this.systemSDK.getDeviceId();
            let deviceSpec = await this.systemSDK.getDeviceInfo();
            let userDeclaredLocation = await this.settingSDK.get('location').catch(err => logger.error('Error while fetching user Location in registerDevice, error:', err.message));
            if (_.isEmpty(userDeclaredLocation)) {
                return;
            }
            let body = {
                id: process.env.APP_ID,
                ver: process.env.APP_VERSION,
                ts: new Date().toISOString(),
                params: {
                    msgid: uuid.v4()
                },
                request: {
                    channel: process.env.CHANNEL,
                    producer: process.env.APP_ID,
                    dspec: deviceSpec,
                    userDeclaredLocation: {
                        state: _.get(userDeclaredLocation, 'state.name'),
                        district: _.get(userDeclaredLocation, 'city.name')
                    }
                }
            };
            HTTPService.post(`${process.env.DEVICE_REGISTRY_URL}/${deviceId}`, body, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.masterKey}`
                }
            })
                .toPromise()
                .then(data => {
                    logger.info(`device registred successfully ${data.status}`);
                    clearInterval(interval);
                    this.getToken(deviceId);
                })
                .catch(error => {
                    logger.error(`Unable to sync device data: ${error.message}`);
                });
        }, 30000);
    }

    async getToken(deviceId: string) {
        if (this.masterKey && deviceId) {
            let headers = {
                "Content-Type": "application/json",
                Authorization: `Bearer ${this.masterKey}`
            };
            let body = {
                id: "api.device.register",
                ver: "1.0",
                ts: Date.now(),
                request: {
                    key: deviceId
                }
            };
            let response = await axios
                .post(
                    process.env.APP_BASE_URL +
                    "/api/api-manager/v1/consumer/desktop_device/credential/register",
                    body,
                    { headers: headers }
                )
                .catch(err => {
                    logger.error(
                        `Error while registering the device status ${
                        err.response.status
                        } data ${err.response.data}`
                    );
                    throw Error(err);
                });
            let key = _.get(response, "data.result.key");
            let secret = _.get(response, "data.result.secret");
            let apiKey = jwt.sign({ iss: key }, secret, { algorithm: "HS256" });
            await this.databaseSdk
                .upsertDoc("settings", "device_token", { api_key: apiKey })
                .catch(err => {
                    logger.error("while inserting the api key to the  database", err);
                });
            return Promise.resolve(apiKey);
        } else {
            throw Error(`Token or deviceID missing to register device ${deviceId}`);
        }
    }
}

