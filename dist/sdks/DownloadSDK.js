"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_ioc_1 = require("typescript-ioc");
const { SuDScheduler } = require("su-downloader3");
const SuDSchedulerOptions = {
    autoStart: true,
    maxConcurrentDownloads: 1,
    downloadOptions: {
        threads: 1,
        throttleRate: 2000,
        timeout: 60000
    }
};
let DownloadSDK = class DownloadSDK {
    constructor() {
        this.suDScheduler = new SuDScheduler(SuDSchedulerOptions);
    }
    queueDownload(id, locations, observer) {
        return this.suDScheduler.queueDownload(id, locations, observer);
    }
    pause(id, stop = true) {
        return this.suDScheduler.pauseDownload(id, stop);
    }
    ;
    cancel(id) {
        return this.suDScheduler.killDownload(id);
    }
    ;
};
DownloadSDK = __decorate([
    typescript_ioc_1.Singleton
], DownloadSDK);
exports.DownloadSDK = DownloadSDK;
