import SystemSDK from './SystemSDK';
import { expect } from 'chai';

describe('SystemSDK', () => {
    it('should get DeviceID', async () => {
        let systemSDK = new SystemSDK()
        systemSDK.getDeviceId().then(id => {
            expect(id).to.be.string;
        })
    })


    xit('should get deviceSpec',  (done) => {
        let systemSDK = new SystemSDK()
        systemSDK.getDeviceInfo().then(id => {
            expect(id).to.be.haveOwnProperty('platform');
            done()
        }).catch(done);
    })
})