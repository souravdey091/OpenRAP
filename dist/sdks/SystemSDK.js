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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_ioc_1 = require("typescript-ioc");
const GetMac = require("getmac");
const crypto = require("crypto");
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const os = __importStar(require("os"));
const si = __importStar(require("systeminformation"));
const _ = __importStar(require("lodash"));
let SystemSDK = class SystemSDK {
    constructor(pluginId) { }
    getDeviceId() {
        if (this.deviceId)
            return Promise.resolve(this.deviceId);
        return new Promise(resolve => {
            GetMac.getMac((err, macAddress) => {
                if (err) {
                    logger_1.logger.error(`Error while getting deviceId ${err}`);
                }
                this.deviceId = crypto
                    .createHash("sha256")
                    .update(macAddress)
                    .digest("hex");
                resolve(this.deviceId);
            });
        });
    }
    getHardDiskInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            let totalHarddisk = 0;
            let availableHarddisk = 0;
            let fsSize = yield si
                .fsSize()
                .catch(error => logger_1.logger.error(`while getting hard disk size`, error));
            if (fsSize) {
                if (os.platform() === "win32") {
                    totalHarddisk = fsSize
                        .map(mountFS => mountFS.size)
                        .reduce((acc, size) => acc + size, 0);
                    let usedHarddisk = fsSize
                        .map(mountFS => mountFS.used)
                        .reduce((acc, size) => acc + size, 0);
                    availableHarddisk = totalHarddisk - usedHarddisk;
                }
                else {
                    totalHarddisk = _.find(fsSize, { mount: "/" })["size"] || 0;
                    let usedHarddisk = _.find(fsSize, { mount: "/" })["used"] || 0;
                    availableHarddisk = totalHarddisk - usedHarddisk;
                }
            }
            return { totalHarddisk, availableHarddisk };
        });
    }
    getMemoryInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            let totalMemory = 0;
            let availableMemory = 0;
            try {
                let memory = yield si.mem();
                totalMemory = _.get(memory, "total") || 0;
                availableMemory = _.get(memory, "free") || 0;
            }
            catch (error) {
                logger_1.logger.error(`while getting memory size`, error);
            }
            return { totalMemory, availableMemory };
        });
    }
    getCpuLoad() {
        return __awaiter(this, void 0, void 0, function* () {
            let currentLoad = yield si
                .currentLoad()
                .catch(err => logger_1.logger.error("while reading CPU Load ", err));
            return currentLoad;
        });
    }
    getNetworkInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            let networkInfo = yield si
                .networkInterfaces()
                .catch(err => logger_1.logger.error("while reading Network info", err));
            return networkInfo;
        });
    }
    getDeviceInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            let deviceInfo = {
                id: "",
                platform: "",
                distro: "",
                osVersion: "",
                servicePack: "",
                arch: "",
                cores: 4,
                cpuManufacturer: "",
                cpuBrand: "",
                cpuSpeed: "",
                cpuLoad: 0,
                systemTime: 0,
                hasBattery: false,
                displayResolution: "",
                appVersion: process.env.APP_VERSION,
                appId: process.env.APP_ID,
                totalMemory: 0,
                availableMemory: 0,
                totalHarddisk: 0,
                availableHarddisk: 0
            };
            deviceInfo.id = yield this.getDeviceId();
            let osInfo = yield si
                .osInfo()
                .catch(err => logger_1.logger.error("while reading os info ", err));
            if (osInfo) {
                deviceInfo.platform = osInfo.platform;
                deviceInfo.distro = osInfo.distro;
                deviceInfo.osVersion = osInfo.release;
                deviceInfo.arch = osInfo.arch;
                deviceInfo.servicePack = osInfo.servicepack;
            }
            let cpu = yield si
                .cpu()
                .catch(err => logger_1.logger.error("while reading cpu info ", err));
            if (cpu) {
                deviceInfo.cores = cpu.cores;
                deviceInfo.cpuManufacturer = cpu.manufacturer;
                deviceInfo.cpuBrand = cpu.brand;
                deviceInfo.cpuSpeed = cpu.speed;
            }
            let currentLoad = yield si
                .currentLoad()
                .catch(err => logger_1.logger.error("while reading current load ", err));
            if (currentLoad) {
                deviceInfo.cpuLoad = currentLoad.currentload;
            }
            deviceInfo.systemTime = si.time()
                ? parseInt(si.time()["current"])
                : Date.now();
            let battery = yield si
                .battery()
                .catch(err => logger_1.logger.error("while reading battery info", err));
            if (battery) {
                deviceInfo.hasBattery = battery.hasbattery;
            }
            let graphics = yield si
                .graphics()
                .catch(err => logger_1.logger.error("while reading graphics info", err));
            if (!_.isEmpty(graphics["displays"][0])) {
                deviceInfo.displayResolution =
                    graphics["displays"][0].currentResX +
                        "*" +
                        graphics["displays"][0].currentResY;
            }
            let hardDiskInfo = yield this.getHardDiskInfo();
            deviceInfo.totalHarddisk = hardDiskInfo.totalHarddisk;
            deviceInfo.availableHarddisk = hardDiskInfo.availableHarddisk;
            let memoryInfo = yield this.getMemoryInfo();
            deviceInfo.totalMemory = memoryInfo.totalMemory;
            deviceInfo.availableMemory = memoryInfo.availableMemory;
            return deviceInfo;
        });
    }
};
SystemSDK = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [String])
], SystemSDK);
exports.default = SystemSDK;
