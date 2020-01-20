import { NetworkQueue } from './networkQueue';
const chai = require('chai'), spies = require('chai-spies');
chai.use(spies);
const spy = chai.spy.sandbox();
const expect = chai.expect;
import {queueListData, errorEvent} from './networkQueue.spec.data';

describe.only('NetworkQueue', async () => {
  let networkQueue;
  before(async () => {
    networkQueue = new NetworkQueue();
    process.env.DATABASE_PATH = __dirname;
  });
  it('should call add method', async () => {
    spy.on(networkQueue, 'enQueue', data => Promise.resolve('123'));
    let read = spy.on(networkQueue, 'read');
    const data = await networkQueue.add({});
    expect(data).to.be.equal('123');
    expect(read).to.have.been.called();
  });
  it('should call read method when internet is available', async () => {
    networkQueue.queueInProgress = false;
    spy.on(networkQueue.networkSDK, 'isInternetAvailable', data => Promise.resolve(true));
    spy.on(networkQueue, 'getByQuery', data => Promise.resolve([{id: '123', data: {}}]));
    let execute = spy.on(networkQueue, 'execute');
    const data = await networkQueue.read();
    expect(execute).to.have.been.called();
  });
  it('should call read method when internet is not available execute method should not get called', async () => {
    networkQueue.queueInProgress = false;
    spy.on(networkQueue.networkSDK, 'isInternetAvailable', data => Promise.resolve(false));
    spy.on(networkQueue, 'getByQuery', data => Promise.resolve([{id: '123', data: {}}]));
    let execute = spy.on(networkQueue, 'execute');
    await networkQueue.read();
    expect(execute).to.not.have.been.called();
  });
  it('call read method and get queue list data with length 3', async () => {
    networkQueue.running = 0;
    networkQueue.concurrency = 5;
    spy.on(networkQueue, 'getByQuery', data => Promise.resolve(queueListData));
    spy.on(networkQueue.networkSDK, 'isInternetAvailable', data => Promise.resolve(true));
    let makeHTTPCall = spy.on(networkQueue, 'makeHTTPCall', data => Promise.resolve({data:{responseCode: 'success'}}));
    await networkQueue.read();
    expect(makeHTTPCall).to.have.been.called.exactly(3);
  });
  it('when queue is in progress, execute method should not get called', async () => {
    networkQueue.queueInProgress = true;
    spy.on(networkQueue.networkSDK, 'isInternetAvailable', data => Promise.resolve(true));
    spy.on(networkQueue, 'getByQuery', data => Promise.resolve([{id: '123', data: {}}]));
    let execute = spy.on(networkQueue, 'execute');
    await networkQueue.read();
    expect(execute).to.not.have.been.called();
  });
  it('when queueData is empty, execute method should not get called', async () => {
    networkQueue.queueInProgress = false;
    spy.on(networkQueue.networkSDK, 'isInternetAvailable', data => Promise.resolve(true));
    spy.on(networkQueue, 'getByQuery', data => Promise.resolve([]));
    let execute = spy.on(networkQueue, 'execute');
    await networkQueue.read();
    expect(execute).to.not.have.been.called();
  });
  it('call execute logTelemetryError', async () => {
    const telemetryInstance = spy.on(networkQueue.telemetryInstance, 'error', data => Promise.resolve({}));
    networkQueue.logTelemetryError({stack: 'stack'});
    expect(telemetryInstance).to.have.been.called.with(errorEvent);
  });
  afterEach(async () => {
    spy.restore();
  })

})
