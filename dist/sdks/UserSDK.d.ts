import { IUser } from "./../interfaces";
export declare class UserSDK {
    private dbSDK;
    constructor();
    read(name?: string): Promise<IUser | UserSDKError>;
    create(user: IUser): Promise<{
        _id: string;
    } | UserSDKError>;
    private findByName;
}
export interface UserSDKError {
    code: string;
    status: number;
    message: string;
}
export * from './../interfaces/IUser';
