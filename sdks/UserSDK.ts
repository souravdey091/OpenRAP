import { Singleton } from "typescript-ioc";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import { DataBaseSDK } from "./DataBaseSDK";
import { IUser } from "./../interfaces";

@Singleton
export class UserSDK {

  @Inject
  private dbSDK: DataBaseSDK;
  constructor() {}
  public async read(name = 'guest'){
    return this.dbSDK.getDoc('user', name);
  }
  public async create(user: IUser){
    return this.dbSDK.insertDoc('user', user, user.name || 'guest');
  }
}
