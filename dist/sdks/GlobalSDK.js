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
Object.defineProperty(exports, "__esModule", { value: true });
const DataBaseSDK_1 = require("./DataBaseSDK");
const _ = __importStar(require("lodash"));
/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
/*
 * Plugin to register with the container on initialization.
 */
let databaseName = "plugin_registry";
exports.register = (pluginId, pluginConfig) => __awaiter(this, void 0, void 0, function* () {
    let dbSDK = new DataBaseSDK_1.DataBaseSDK();
    yield dbSDK.upsertDoc(databaseName, pluginId, pluginConfig);
    return true;
});
/*
 * Get the plugin configuration.
 * @param pluginId String
 * @return pluginConfig
 */
exports.get = (pluginId) => __awaiter(this, void 0, void 0, function* () {
    let dbSDK = new DataBaseSDK_1.DataBaseSDK();
    let pluginConfig = yield dbSDK.getDoc(databaseName, pluginId);
    delete pluginConfig["_id"];
    delete pluginConfig["_rev"];
    return Promise.resolve(pluginConfig);
});
/*
 * list the plugins .
 
 * @return plugins
 */
exports.list = () => __awaiter(this, void 0, void 0, function* () {
    let dbSDK = new DataBaseSDK_1.DataBaseSDK();
    let { docs } = yield dbSDK.find(databaseName, { selector: {} });
    let pluginConfigs = [];
    _.forEach(docs, doc => {
        let pluginConfig = _.omit(doc, ["_id", "_rev"]);
        pluginConfig.id = doc["_id"];
        pluginConfigs.push(pluginConfig);
    });
    return Promise.resolve(pluginConfigs);
});
