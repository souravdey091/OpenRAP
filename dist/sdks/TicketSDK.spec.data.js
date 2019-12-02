"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mandatoryFieldError = {
    status: 400,
    code: 'MANDATORY_FIELD_MISSING',
    message: 'Mandatory fields are missing'
};
exports.networkError = {
    status: 400,
    code: 'NETWORK_UNAVAILABLE',
    message: 'Network unavailable'
};
exports.helpDeskError = {
    status: 400,
    code: 'FRESH_DESK_API_ERROR',
    message: 'test message'
};
exports.helpDeskSuccess = {
    status: 200,
    code: 'SUCCESS',
    message: 'Ticket created successfully'
};
exports.ticketReq = {
    email: "anoopm@ilimi.in", description: "test ticket"
};
