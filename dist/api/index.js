"use strict";
/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_ioc_1 = require("typescript-ioc");
const index_1 = require("./../index");
const GlobalSDK_1 = require("./../sdks/GlobalSDK");
const SettingSDK_1 = __importDefault(require("./../sdks/SettingSDK"));
const FileSDK_1 = __importDefault(require("./../sdks/FileSDK"));
const NetworkSDK_1 = __importDefault(require("./../sdks/NetworkSDK"));
const DownloadManager_1 = __importDefault(require("./../managers/DownloadManager/DownloadManager"));
const SystemSDK_1 = __importDefault(require("./../sdks/SystemSDK"));
const TelemetrySDK_1 = __importDefault(require("./../sdks/TelemetrySDK"));
const UserSDK_1 = require("./../sdks/UserSDK");
const TicketSDK_1 = require("./../sdks/TicketSDK");
const DownloadSDK_1 = require("./../sdks/DownloadSDK");
const queue_1 = require("./../services/queue");
var queue_2 = require("./../services/queue");
exports.SystemQueueStatus = queue_2.SystemQueueStatus;
let ContainerAPI = class ContainerAPI {
    bootstrap() {
        return __awaiter(this, void 0, void 0, function* () {
            yield index_1.App.bootstrap();
        });
    }
    register(pluginId, pluginInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            yield GlobalSDK_1.register(pluginId, pluginInfo);
        });
    }
    // get the Setting SDK by plugin
    getSettingSDKInstance(pluginId) {
        return new SettingSDK_1.default(pluginId);
    }
    // get file SDK by plugin
    getFileSDKInstance(pluginId) {
        return new FileSDK_1.default(pluginId);
    }
    getDownloadSdkInstance() {
        return this.downloadSDK;
    }
    // get the Network SDK
    getNetworkStatus(url) {
        return __awaiter(this, void 0, void 0, function* () {
            let networkSDK = new NetworkSDK_1.default();
            let status = yield networkSDK.isInternetAvailable(url);
            return status;
        });
    }
    // get the downloadManager Instance
    getDownloadManagerInstance(pluginId) {
        return new DownloadManager_1.default(pluginId);
    }
    getSystemSDKInstance(pluginId) {
        return new SystemSDK_1.default(pluginId);
    }
    getTelemetrySDKInstance() {
        return new TelemetrySDK_1.default();
    }
    getUserSdkInstance() {
        return this.userSDK;
    }
    getTicketSdkInstance() {
        return this.ticketSDK;
    }
    initializeSystemQueue() {
        this.systemQueue.initialize();
    }
    getSystemQueueInstance(pluginId) {
        const register = (type, taskExecuter) => {
            return this.systemQueue.register(pluginId, type, taskExecuter);
        };
        const add = (tasks) => {
            return this.systemQueue.add(pluginId, tasks);
        };
        const query = (query, sort) => {
            return this.systemQueue.query(pluginId, query, sort);
        };
        const pause = (_id) => {
            return this.systemQueue.pause(pluginId, _id);
        };
        const resume = (_id) => {
            return this.systemQueue.resume(pluginId, _id);
        };
        const cancel = (_id) => {
            return this.systemQueue.cancel(pluginId, _id);
        };
        const retry = (_id) => {
            return this.systemQueue.retry(pluginId, _id);
        };
        const migrate = (tasks) => {
            return this.systemQueue.migrate(tasks);
        };
        return { register, add, query, pause, resume, cancel, retry, migrate };
    }
};
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", UserSDK_1.UserSDK)
], ContainerAPI.prototype, "userSDK", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", TicketSDK_1.TicketSDK)
], ContainerAPI.prototype, "ticketSDK", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", queue_1.SystemQueue)
], ContainerAPI.prototype, "systemQueue", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", DownloadSDK_1.DownloadSDK)
], ContainerAPI.prototype, "downloadSDK", void 0);
ContainerAPI = __decorate([
    typescript_ioc_1.Singleton
], ContainerAPI);
exports.containerAPI = new ContainerAPI();
