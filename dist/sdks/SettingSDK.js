"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const DataBaseSDK_1 = require("./DataBaseSDK");
const utils_1 = require("./../utils");
const typescript_ioc_1 = require("typescript-ioc");
const telemetryInstance_1 = require("./../services/telemetry/telemetryInstance");
/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
let dbName = "settings";
class SettingSDK {
    constructor(pluginId) {
        this.pluginId = pluginId;
        /*
         * Method to put the setting
         * @param key String - The key for the config/setting prefixed with pluginId Hash string
         * @param value Object - The value of the setting
         */
        this.put = (key, value) => __awaiter(this, void 0, void 0, function* () {
            this.telemetryInstance.log({
                context: {
                    env: "settingSDK"
                },
                edata: {
                    level: "INFO",
                    type: "OTHER",
                    message: `${key} is updated`,
                    params: [
                        {
                            key: key
                        },
                        {
                            value: value
                        },
                        {
                            pluginId: this.pluginId
                        }
                    ]
                }
            });
            let keyName = this.pluginId ? `${utils_1.hash(this.pluginId)}_${key}` : key;
            yield this.dbSDK.upsertDoc(dbName, keyName, value);
            return true;
        });
        /*
         * Method to get the setting
         * @param key String - The key for the config/setting
         * @return value Object
         */
        this.get = (key) => __awaiter(this, void 0, void 0, function* () {
            let keyName = this.pluginId ? `${utils_1.hash(this.pluginId)}_${key}` : key;
            let setting = yield this.dbSDK.getDoc(dbName, keyName);
            delete setting["_id"];
            delete setting["_rev"];
            return Promise.resolve(setting);
        });
    }
}
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], SettingSDK.prototype, "dbSDK", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", telemetryInstance_1.TelemetryInstance)
], SettingSDK.prototype, "telemetryInstance", void 0);
exports.default = SettingSDK;
