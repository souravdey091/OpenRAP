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
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_ioc_1 = require("typescript-ioc");
const GetMac = require("getmac");
const utils_1 = require("./../utils");
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
let SystemSDK = class SystemSDK {
    constructor(pluginId) { }
    getDeviceId() {
        if (this.deviceId)
            return Promise.resolve(this.deviceId);
        return new Promise(resolve => {
            GetMac.getMac((err, macAddress) => {
                logger_1.logger.error(`Error while getting deviceId ${err}`);
                this.deviceId = utils_1.hash(macAddress);
                resolve(this.deviceId);
            });
        });
    }
    getDiskSpaceInfo() { }
    getMemoryInfo() { }
    getDeviceInfo() { }
    getAll() { }
};
SystemSDK = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [String])
], SystemSDK);
exports.default = SystemSDK;
