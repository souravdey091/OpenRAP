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
const EventManager_1 = require("@project-sunbird/ext-framework-server/managers/EventManager");
const typescript_ioc_1 = require("typescript-ioc");
const dns = __importStar(require("dns"));
const telemetryInstance_1 = require("./../services/telemetry/telemetryInstance");
const typescript_ioc_2 = require("typescript-ioc");
let NetworkSDK = class NetworkSDK {
    constructor() {
        this.isInternetAvailable = (baseUrl) => {
            return new Promise(resolve => {
                let endPointUrl = baseUrl
                    ? baseUrl
                    : process.env.APP_BASE_URL;
                const url = new URL(endPointUrl);
                dns.lookup(url.hostname, err => {
                    if (err) {
                        resolve(false);
                    }
                    else {
                        resolve(true);
                    }
                });
            });
        };
        this.setInitialStatus();
        this.setEventEmitter();
    }
    setInitialStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            this.internetStatus = yield this.isInternetAvailable();
        });
    }
    setEventEmitter() {
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            let status = yield this.isInternetAvailable();
            if (this.internetStatus !== status) {
                if (status) {
                    EventManager_1.EventManager.emit("network:available", {});
                    this.internetStatus = status;
                }
                else {
                    EventManager_1.EventManager.emit("network:disconnected", {});
                    this.internetStatus = status;
                }
                this.telemetryInstance.interrupt({
                    context: {
                        env: "network"
                    },
                    edata: {
                        type: status ? "connected" : "disconnected"
                    }
                });
            }
        }), 300000);
    }
};
__decorate([
    typescript_ioc_2.Inject,
    __metadata("design:type", telemetryInstance_1.TelemetryInstance)
], NetworkSDK.prototype, "telemetryInstance", void 0);
NetworkSDK = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [])
], NetworkSDK);
exports.default = NetworkSDK;
//network:available
//network:disconnected
