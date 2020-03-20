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
    private config: IConfig;
    private apiKey: string;

    initialize(config: IConfig) {
        this.config = config;
    }

    async register() {
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
                    Authorization: `Bearer ${this.apiKey}`
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
        // Return API key if already exist
        if (this.apiKey) {
            logger.info("Received token from local");
            return Promise.resolve(this.apiKey);
        }

        try {
            // Try to get it from DB, set in local and return
            let { api_key } = await this.databaseSdk.getDoc(
                "settings",
                "device_token"
            );
            this.apiKey = api_key;
            logger.info("Received token from Database");
            return Promise.resolve(this.apiKey);
        } catch (error) {
            // Try to get it from API, set in local and return
            if (_.get(this.config, 'key') && deviceId) {
                let headers = {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${_.get(this.config, 'key')}`
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
                this.apiKey = apiKey;
                logger.info("Received token from API");
                return Promise.resolve(this.apiKey);
            } else {
                throw Error(`Token or deviceID missing to register device ${deviceId}`);
            }
        }
    }
}

export interface IConfig {
    key: string;
}

