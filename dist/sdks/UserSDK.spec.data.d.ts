declare const DEFAULT_USER = "guest";
declare const userCreateWithDefaultName: {
    framework: {
        board: string;
        medium: string[];
        gradeLevel: string[];
    };
};
declare const userCreateWithName1: {
    name: string;
    data: {
        formatedName: string;
        framework: {
            board: string;
            medium: string[];
            gradeLevel: string[];
        };
    };
};
declare const userCreateWithName2: {
    name: string;
    data: {
        formatedName: string;
        framework: {
            board: string;
            medium: string[];
            gradeLevel: string[];
        };
    };
};
declare const createError: {
    code: string;
    status: number;
    message: string;
};
declare const readError: {
    code: string;
    status: number;
    message: string;
};
declare const updateError: {
    code: string;
    status: number;
    message: string;
};
declare const updateMandatoryError: {
    code: string;
    status: number;
    message: string;
};
declare const mandatoryFrameworkError: {
    code: string;
    status: number;
    message: string;
};
export { userCreateWithDefaultName, userCreateWithName1, userCreateWithName2, createError, readError, DEFAULT_USER, mandatoryFrameworkError, updateError, updateMandatoryError };
