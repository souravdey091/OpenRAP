import { expect } from "chai";
import TelemetrySDK from "./TelemetrySDK";
import * as _ from "lodash";
import { TelemetryInstance } from "./../services/telemetry/telemetryInstance";

let telemetryInstance: TelemetryInstance = new TelemetryInstance();

let telemetrySDK = new TelemetrySDK();

describe("TelemetrySDK", () => {

  before( () => {
    process.env.FILES_PATH = __dirname
  })
  it("should get the telemetryInstance", () => {
    expect(telemetrySDK.getInstance()).to.be.instanceOf(TelemetryInstance);
  });

  it("should send the telemetryEvents", () => {
    let event = {
      eid: "START",
      ets: 1569914181294,
      ver: "3.0",
      mid: "START:ba3bf4531aaf7b31bfacec988d9c3744",
      actor: {
        id: "d91406817c80b540c49434a5ba7d365db6ca88672304b444118be2e331718d75",
        type: "User"
      },
      context: {
        channel: "505c7c48ac6dc1edc9b08f21db5a571d",
        pdata: {
          id: "prod.diksha.desktop",
          ver: "2.0",
          pid: "sunbird-portal.contentplayer"
        },
        env: "contentplayer",
        sid: "9fb221f7-cfce-9c08-75c7-de0718d5b767",
        did: "d91406817c80b540c49434a5ba7d365db6ca88672304b444118be2e331718d75",
        cdata: [
          { id: "9fd60c07a690f2d54ba515e095b839ca", type: "ContentSession" }
        ],
        rollup: { l1: "505c7c48ac6dc1edc9b08f21db5a571d" }
      },
      object: {
        id: "do_312473549722288128119665",
        type: "Content",
        ver: "1",
        rollup: {}
      },
      tags: [],
      edata: { type: "content", mode: "play", pageid: "", duration: 1.49 }
    };
    telemetrySDK.send([event]);
  });
});
