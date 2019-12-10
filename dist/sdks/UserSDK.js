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
const _ = __importStar(require("lodash"));
const typescript_ioc_2 = require("typescript-ioc");
const DataBaseSDK_1 = require("./DataBaseSDK");
const v4_1 = __importDefault(require("uuid/v4"));
const DEFAULT_USER_NAME = 'guest';
const USER_DB = 'users';
let UserSDK = class UserSDK {
    constructor() { }
    read(name = DEFAULT_USER_NAME) {
        return __awaiter(this, void 0, void 0, function* () {
            const users = yield this.findByName(name);
            if (!users.length) {
                throw {
                    code: "USER_NOT_FOUND",
                    status: 404,
                    message: `User not found with name ${name}`
                };
            }
            delete users[0]['_rev'];
            return users[0];
        });
    }
    create(user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (_.isEmpty(_.get(user, 'framework'))) {
                throw {
                    code: "BAD_REQUEST",
                    status: 400,
                    message: `Framework is mandatory to create user`
                };
            }
            user.formatedName = user.formatedName || DEFAULT_USER_NAME; // user entered name
            user.name = user.formatedName.toLowerCase().trim();
            const userExist = yield this.findByName(user.name);
            if (!_.isEmpty(userExist)) {
                throw {
                    code: "UPDATE_CONFLICT",
                    status: 409,
                    message: `User already exist with name ${user.name}`
                };
            }
            user._id = v4_1.default();
            user.createdOn = Date.now();
            user.updatedOn = Date.now();
            return this.dbSDK.insertDoc(USER_DB, user, user._id)
                .then(data => ({ _id: data.id }));
        });
    }
    update(user) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!_.get(user, '_id')) {
                throw {
                    code: "BAD_REQUEST",
                    status: 400,
                    message: `_id is mandatory to update user`
                };
            }
            user.updatedOn = Date.now();
            return this.dbSDK.updateDoc(USER_DB, user._id, user)
                .then(data => ({ _id: data.id }))
                .catch(err => { throw this.dbSDK.handleError(err); });
        });
    }
    findByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = {
                selector: { name }
            };
            return this.dbSDK.find(USER_DB, query).then(result => result.docs);
        });
    }
};
__decorate([
    typescript_ioc_2.Inject,
    __metadata("design:type", DataBaseSDK_1.DataBaseSDK)
], UserSDK.prototype, "dbSDK", void 0);
UserSDK = __decorate([
    typescript_ioc_1.Singleton,
    __metadata("design:paramtypes", [])
], UserSDK);
exports.UserSDK = UserSDK;
