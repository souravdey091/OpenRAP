import { Singleton } from "typescript-ioc";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import { DataBaseSDK } from "./DataBaseSDK";
import { IUser } from "./../interfaces";
import uuid from "uuid/v4";
const DEFAULT_USER_NAME = 'guest';
const USER_DB = 'users';

@Singleton
export class UserSDK {

  @Inject
  private dbSDK: DataBaseSDK;
  constructor() {}

  public async read(name = DEFAULT_USER_NAME): Promise<IUser | UserSDKError>{
    const users: Array<IUser> = await this.findByName(name);
    if(!users.length){
      throw {
        code: "USER_NOT_FOUND",
        status: 404,
        message: `User not found with name ${name}`
      }
    }
    delete users[0]['_rev'];
    return users[0];
  }

  public async create(user: IUser): Promise<{_id: string} | UserSDKError>{
    if(_.get(user, 'framework')){
      throw {
        code: "BAD_REQUEST",
        status: 400,
        message: `Framework is mandatory to create user`
      }
    }
    user.formatedName = user.formatedName || DEFAULT_USER_NAME; // user entered name
    user.name = user.formatedName.toLowerCase().trim();
    const userExist = await this.findByName(user.name);
    if(!_.isEmpty(userExist)){
      throw {
        code: "UPDATE_CONFLICT",
        status: 409,
        message: `User already exist with name ${user.name}`
      }
    }
    user._id = uuid();
    user.createdOn = Date.now();
    user.updatedOn = Date.now();
    return this.dbSDK.insertDoc(USER_DB, user, user._id)
    .then(data => ({_id: data.id}));
  }

  private async findByName(name){
    const query = {
      selector: { name }
    }
    return this.dbSDK.find(USER_DB, query).then(result => result.docs);
  }

}
export interface UserSDKError {
  code: string;
  status: number;
  message: string;
}

export * from './../interfaces/IUser';
