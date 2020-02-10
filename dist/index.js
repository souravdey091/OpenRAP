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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const DataBaseSDK_1 = require("./sdks/DataBaseSDK");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const _ = __importStar(require("lodash"));
const NetworkSDK_1 = __importDefault(require("./sdks/NetworkSDK"));
const TelemetryManager_1 = require("./managers/TelemetryManager");
const networkQueue_1 = require("./services/queue/networkQueue");
const typescript_ioc_1 = require("typescript-ioc");
class App {
    static bootstrap() {
        return __awaiter(this, void 0, void 0, function* () {
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
            let interval = parseInt(process.env.TELEMETRY_SYNC_INTERVAL_IN_SECS) * 1000 || 30000;
            this.telemetryManager.registerDevice();
            // TODO - Need to remove migrateTelemetryPacketToQueueDB in next release - 2.9.0
            setTimeout(() => { this.telemetryManager.migrateTelemetryPacketToQueueDB(); }, interval);
            setTimeout(() => { this.telemetryManager.archive(); }, interval);
            setInterval(() => this.telemetryManager.batchJob(), 120000);
            setInterval(() => this.networkQueue.start(), 60000);
            // initialize the network sdk to emit the internet available or disconnected events
            new NetworkSDK_1.default();
        });
    }
    ;
}
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", networkQueue_1.NetworkQueue)
], App, "networkQueue", void 0);
__decorate([
    typescript_ioc_1.Inject,
    __metadata("design:type", TelemetryManager_1.TelemetryManager)
], App, "telemetryManager", void 0);
exports.App = App;
