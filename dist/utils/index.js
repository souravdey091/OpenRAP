"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hashids_1 = __importDefault(require("hashids"));
exports.hash = (text) => {
    let hash = new hashids_1.default(text, 15, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ");
    return hash.encode(1).toLowerCase();
};
