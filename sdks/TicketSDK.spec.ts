import { TicketSDK } from './TicketSDK';
import { expect } from 'chai';
import { HTTPService } from "@project-sunbird/ext-framework-server/services";
import { of, throwError } from 'rxjs';
import { networkError, helpDeskError, helpDeskSuccess, ticketReq } from './TicketSDK.spec.data';
const chai = require('chai'), spies = require('chai-spies');
chai.use(spies);
const spy = chai.spy.sandbox();

describe('TicketSDK', async () => {
  let ticketSDK;
  beforeEach(async () => {
    ticketSDK = new TicketSDK();
    spy.on(ticketSDK.systemSDK, 'getDeviceId', data => Promise.resolve('deviceId'));
    spy.on(ticketSDK.systemSDK, 'getDeviceInfo', data => Promise.resolve({}));
    spy.on(ticketSDK.systemSDK, 'getNetworkInfo', data => Promise.resolve({}));
    spy.on(ticketSDK.systemSDK, 'getCpuLoad', data => Promise.resolve({}));
  });
  afterEach(async () => {
    spy.restore();
  })
  it('should throw error if internet is not available', async () => {
    spy.on(ticketSDK.networkSDK, 'isInternetAvailable', data => Promise.resolve(false));
    await ticketSDK.createTicket(ticketReq).catch(err => {
      expect(err).to.deep.equal(networkError);
    });
  });
  it('should throw error if helpdesk api throws error', async () => {
    spy.on(ticketSDK.networkSDK, 'isInternetAvailable', data => Promise.resolve(true));
    spy.on(HTTPService, 'post', data => throwError({message: helpDeskError.message}));
    await ticketSDK.createTicket(ticketReq).catch(err => {
      expect(err).to.deep.equal(helpDeskError);
    });
  });
  it('should return success if helpdesk api return success', async () => {
    spy.on(ticketSDK.networkSDK, 'isInternetAvailable', data => Promise.resolve(true));
    spy.on(HTTPService, 'post', data => of({message: helpDeskSuccess.message}));
    await ticketSDK.createTicket(ticketReq).then(res => {
      expect(res).to.deep.equal(helpDeskSuccess);
    });
  });
})
