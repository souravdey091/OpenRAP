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
const services_1 = require("@project-sunbird/ext-framework-server/services");
const EventManager_1 = require("@project-sunbird/ext-framework-server/managers/EventManager");
const typescript_ioc_1 = require("typescript-ioc");
let NetworkSDK = class NetworkSDK {
    constructor() {
        this.isInternetAvailable = (baseUrl) => {
            return new Promise((resolve) => {
                let endPointUrl = baseUrl ? baseUrl : process.env.APP_BASE_URL;
                services_1.HTTPService.head(endPointUrl)
                    .toPromise()
                    .then(() => {
                    resolve(true);
                }).catch(err => {
                    resolve(false);
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
                    EventManager_1.EventManager.emit('network:available', {});
                    this.internetStatus = status;
                }
                else {
                    EventManager_1.EventManager.emit('network:disconnected', {});
                    this.internetStatus = status;
                }
            }
        }), 30000);
    }
};
NetworkSDK = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [])
], NetworkSDK);
exports.default = NetworkSDK;
//network:available
//network:disconnected
