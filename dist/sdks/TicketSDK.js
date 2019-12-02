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
const typescript_ioc_1 = require("typescript-ioc");
const logger_1 = require("@project-sunbird/ext-framework-server/logger");
const _ = __importStar(require("lodash"));
const typescript_ioc_2 = require("typescript-ioc");
const SystemSDK_1 = __importDefault(require("./SystemSDK"));
const NetworkSDK_1 = __importDefault(require("./NetworkSDK"));
const services_1 = require("@project-sunbird/ext-framework-server/services");
const FormData = require('form-data');
let TicketSDK = class TicketSDK {
    constructor() { }
    createTicket(ticketReq) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!ticketReq || !ticketReq.email || !ticketReq.description) {
                throw {
                    status: 400,
                    code: 'MANDATORY_FIELD_MISSING',
                    message: 'Mandatory fields are missing'
                };
            }
            const networkAvailable = yield this.networkSDK.isInternetAvailable();
            if (!networkAvailable) {
                throw {
                    status: 400,
                    code: 'NETWORK_UNAVAILABLE',
                    message: 'Network unavailable'
                };
            }
            const deviceId = yield this.systemSDK.getDeviceId();
            const deviceInfo = yield this.systemSDK.getDeviceInfo();
            deviceInfo.networkInfo = yield this.systemSDK.getNetworkInfo();
            deviceInfo.cpuLoad = yield this.systemSDK.getCpuLoad();
            const formData = new FormData();
            formData.append('status', 2);
            formData.append('priority', 2);
            formData.append('description', ticketReq.description);
            formData.append('subject', `${process.env.APP_NAME} Desktop App Support request - ${deviceId}`);
            formData.append('email', ticketReq.email);
            formData.append('custom_fields[cf_ticket_current_status]', "FD-L1-Unclassified");
            formData.append('custom_fields[cf_severity]', "S2");
            formData.append('custom_fields[cf_reqeststatus]', "None");
            formData.append('custom_fields[cf_reasonforseverity]', "Offline Desktop App Query");
            formData.append('attachments[]', JSON.stringify(deviceInfo), { filename: 'deviceSpec.json', contentType: 'application/json' });
            const headers = Object.assign({ authorization: `Bearer ${process.env.APP_BASE_URL_TOKEN}` }, formData.getHeaders());
            return services_1.HTTPService.post(`${process.env.APP_BASE_URL}/api/tickets/v1/create `, formData, { headers }).toPromise()
                .then((data) => {
                logger_1.logger.info('Ticket created successfully', data.data);
                return {
                    status: 200,
                    code: 'SUCCESS',
                    message: 'Ticket created successfully'
                };
            })
                .catch(error => {
                logger_1.logger.error('Error while creating tickets', _.get(error, 'response.data') || error.message);
                throw {
                    status: _.get(error, 'response.status') || 400,
                    code: _.get(error, 'response.data.code') || 'FRESH_DESK_API_ERROR',
                    message: error.message
                };
            });
        });
    }
};
__decorate([
    typescript_ioc_2.Inject,
    __metadata("design:type", NetworkSDK_1.default)
], TicketSDK.prototype, "networkSDK", void 0);
__decorate([
    typescript_ioc_2.Inject,
    __metadata("design:type", SystemSDK_1.default)
], TicketSDK.prototype, "systemSDK", void 0);
TicketSDK = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [])
], TicketSDK);
exports.TicketSDK = TicketSDK;
