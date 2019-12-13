"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const DEFAULT_USER = 'guest';
exports.DEFAULT_USER = DEFAULT_USER;
const userCreateWithDefaultName = {
    framework: {
        board: 'English',
        medium: ['English'],
        gradeLevel: ['Class 5']
    }
};
exports.userCreateWithDefaultName = userCreateWithDefaultName;
const userCreateWithName1 = {
    name: "anoop",
    data: {
        formatedName: "Anoop",
        framework: {
            board: 'English',
            medium: ['English'],
            gradeLevel: ['Class 5']
        }
    }
};
exports.userCreateWithName1 = userCreateWithName1;
const userCreateWithName2 = {
    name: "anoop hm",
    data: {
        formatedName: " Anoop HM ",
        framework: {
            board: 'English',
            medium: ['English'],
            gradeLevel: ['Class 5']
        }
    }
};
exports.userCreateWithName2 = userCreateWithName2;
const createError = {
    code: "UPDATE_CONFLICT",
    status: 409,
    message: `User already exist with name`
};
exports.createError = createError;
const readError = {
    code: "USER_NOT_FOUND",
    status: 404,
    message: `User not found with name`
};
exports.readError = readError;
const updateError = {
    code: "DOC_NOT_FOUND",
    status: 404,
    message: `Document not found with id`
};
exports.updateError = updateError;
const updateMandatoryError = {
    code: "BAD_REQUEST",
    status: 400,
    message: `_id is mandatory to update user`
};
exports.updateMandatoryError = updateMandatoryError;
const mandatoryFrameworkError = {
    code: "BAD_REQUEST",
    status: 400,
    message: `Framework is mandatory to create user`
};
exports.mandatoryFrameworkError = mandatoryFrameworkError;
