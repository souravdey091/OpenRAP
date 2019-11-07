"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DataBaseSDK_1 = require("./sdks/DataBaseSDK");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const _ = __importStar(require("lodash"));
const DownloadManager_1 = require("./managers/DownloadManager/DownloadManager");
const NetworkSDK_1 = __importDefault(require("./sdks/NetworkSDK"));
const TelemetrySyncManager_1 = require("./managers/TelemetrySyncManager");
// Initialize container
const bootstrap = () => __awaiter(this, void 0, void 0, function* () {
    // initialize the telemetry instance, to get it in other modules
    // create databases for the container
    let dataBase = new DataBaseSDK_1.DataBaseSDK();
    let schema = JSON.parse(fs.readFileSync(path.join(__dirname, "db", "schemas.json"), {
        encoding: "utf8"
    }));
    let databases = schema.databases;
    for (const db of databases) {
        dataBase.createDB(db.name);
    }
    for (const db of databases) {
        if (!_.isEmpty(db["indexes"])) {
            for (const index of db.indexes) {
                yield dataBase.createIndex(db.name, index);
            }
        }
    }
    yield DownloadManager_1.reconciliation();
    const telemetrySyncManager = new TelemetrySyncManager_1.TelemetrySyncManager();
    telemetrySyncManager.registerDevice();
    let interval = parseInt(process.env.TELEMETRY_SYNC_INTERVAL_IN_SECS) * 1000 || 30000;
    setInterval(() => telemetrySyncManager.batchJob(), interval);
    setInterval(() => telemetrySyncManager.syncJob(), interval);
    setInterval(() => telemetrySyncManager.cleanUpJob(), interval);
    // initialize the network sdk to emit the internet available or disconnected events
    new NetworkSDK_1.default();
});
exports.bootstrap = bootstrap;
