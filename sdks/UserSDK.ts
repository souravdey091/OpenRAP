import { Singleton } from "typescript-ioc";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import { DataBaseSDK, DBError } from "./DataBaseSDK";
import { IUser } from "./../interfaces";
const DEFAULT_USER = 'guest1';
const USER_DB = 'users';

@Singleton
export class UserSDK {

  @Inject
  private dbSDK: DataBaseSDK;
  constructor() {}

  public async read(_id = DEFAULT_USER): Promise<IUser | DBError>{
    return this.dbSDK.getDoc(USER_DB, _id).then(res => {
      delete res._rev;
      return res;
    }).catch(error => {
      throw this.dbSDK.handleError(error);
    });
  }

  public async create(user: IUser): Promise<{id: string} | DBError>{
    user._id = !user.name ?  DEFAULT_USER : user.name.replace(/ /g,'').toLowerCase();
    user.name = user.name || DEFAULT_USER;
    user.createdOn = Date.now();
    user.updatedOn = Date.now();
    return this.dbSDK.insertDoc(USER_DB, user, user._id)
    .then(data => ({id: data.id}))
    .catch(error => {
      throw this.dbSDK.handleError(error);
    });;
  }

}
