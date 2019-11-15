import { Singleton } from "typescript-ioc";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import { DataBaseSDK } from "./DataBaseSDK";
import { IUser } from "./../interfaces";
import uuid from "uuid/v4";
const DEFAULT_USER_ID = 'guest';
const USER_DB = 'user';

@Singleton
export class UserSDK {

  @Inject
  private dbSDK: DataBaseSDK;
  constructor() {}

  public async read(_id = DEFAULT_USER_ID){
    return this.dbSDK.getDoc(USER_DB, _id);
  }

  public async create(user: IUser){
    user.name = user.name || DEFAULT_USER_ID;
    user._id = !user.name ?  DEFAULT_USER_ID : uuid();
    user.createdOn = Date.now();
    user.updatedOn = Date.now();
    return this.dbSDK.insertDoc(USER_DB, user, user.name || 'guest');
  }

}
