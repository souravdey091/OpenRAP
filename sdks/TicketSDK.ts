import { Singleton } from "typescript-ioc";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import * as _ from "lodash";
import { Inject } from "typescript-ioc";
import SystemSDK from "./SystemSDK"; 
import NetworkSDK from "./NetworkSDK"; 
import { HTTPService } from "@project-sunbird/ext-framework-server/services";
const FormData = require('form-data');

@Singleton
export class TicketSDK {

  @Inject private networkSDK: NetworkSDK;
  @Inject private systemSDK: SystemSDK;
  constructor() {}

  async createTicket(req: ITicketReq): Promise<{message: string, code: string, status: number} | any> {
    const networkAvailable = await this.networkSDK.isInternetAvailable();
    if(!networkAvailable){
      throw {
        status: 400,
        code: 'NETWORK_UNAVAILABLE',
        message: 'Network unavailable'
      }
    }
    const deviceId = await this.systemSDK.getDeviceId();
    const deviceInfo: any = await this.systemSDK.getDeviceInfo();
    deviceInfo.networkInfo = await this.systemSDK.getNetworkInfo();
    deviceInfo.cpuLoad = await this.systemSDK.getCpuLoad();
    const formData = new FormData();
    formData.append('status', 2);
    formData.append('priority', 2);
    formData.append('description', req.description);
    formData.append('subject',`${process.env.APP_NAME} Desktop App Support request - ${deviceId}`)
    formData.append('email', req.email);
    formData.append('custom_fields', JSON.stringify({
      cf_ticket_current_status: "FD-L1-Unclassified",
      cf_severity: "S2",
      cf_reqeststatus: "None",
      cf_reasonforseverity: "Offline Desktop App Query"
    }))
    formData.append('deviceSpec.json', JSON.stringify(deviceInfo), { filename: 'deviceSpec.json', contentType: 'application/json'});
    const headers = {
      Authorization: `Basic ${process.env.FRESH_DESK_TOKEN}`,
      ...formData.getHeaders(),
    }
    await HTTPService.post(`${process.env.FRESH_DESK_BASE_URL}/api/v2/tickets`, formData, {headers}).toPromise() // const axios = require('axios'); await axios.post(FRESH_DESK_URL, formData, {headers})
    .then((data: any) => {
      logger.info('Ticket created successfully', Object.keys(data), data.response, data.data);
      return {
        status: 200,
        code: 'SUCCESS',
        message: 'Ticket created successfully'
      }
    })
    .catch(error => {
      logger.log('Error while creating tickets', Object.keys(error), error.response);
      throw {
        status: _.get(error, 'response.status') || 400,
        code: _.get(error, 'response.data.code') || 'FRESH_DESK_API_ERROR',
        message: error.message
      };
    });
  }
}
export interface ITicketReq {
  email: string,
  description: string;
}