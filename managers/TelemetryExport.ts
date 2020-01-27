import * as  _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import { DataBaseSDK } from "../sdks/DataBaseSDK";
import { Inject, Singleton } from "typescript-ioc";
import FileSDK from "../sdks/FileSDK";
import * as uuid from "uuid";
import { Readable } from 'stream';

@Singleton
export class TelemetryExport {
    @Inject private databaseSdk: DataBaseSDK;
    private telemetryArchive;
    private cb;
    constructor(private destFolder) { }

    getStream(id) {
        let getData = (id) => {
            return new Promise((resolve, reject) => {
                this.databaseSdk.getDoc('queue', id).then((dbData) => {
                    resolve(Buffer.from(dbData.requestBody.data));
                }).catch((err) => {
                    reject(err)
                });
            });
        }
        const inStream = new Readable({
            read() {
                getData(id).then(data => {
                    this.push(data)
                    this.push(null)
                }).catch((err) => {
                    this.destroy(err)
                })

            }
        });
        return inStream;
    }

    private archiveAppend(type, src, dest) {
        logger.info(`Adding ${src} of type ${type} to dest folder ${dest}`);
        if (type === "path") {
            this.telemetryArchive.append(fs.createReadStream(src), { name: dest });
        } else if (type === "directory") {
            this.telemetryArchive.directory(src, dest);
        } else if (type === "stream") {
            this.telemetryArchive.append(src, { name: dest });
        } else if (type === "createDir") {
            dest = dest.endsWith("/") ? dest : dest + "/";
            this.telemetryArchive.append(null, { name: dest });
        } else if (type === "buffer") {
            this.telemetryArchive.append(src, { name: dest });
        }
    }

    private getManifestBuffer(count: number, items: IItems[]) {
        const manifestData = {
            id: "sunbird.data.archive",
            ver: "1.0", // Need to confirm
            ts: new Date(),
            producer: {
                id: 'did', //Device id - need to confirm
                pid: '',// Need to confirm,
                ver: '',// Need to confirm
            },
            archive: {
                count: count,
                items: items
            },
        };
        return Buffer.from(JSON.stringify(manifestData));
    }

    private async streamZip() {
        return new Promise((resolve, reject) => {
            const ecarFilePath = path.join(this.destFolder, 'telemetry.zip');
            const output = fs.createWriteStream(ecarFilePath);
            output.on("close", () => resolve({
            }));

            output.on('finish', () => {
                console.log('====================finish')
            });

            output.on("error", () => {
                console.log('====================error')

            });
            this.telemetryArchive.on("end", () => {
                console.log('done+++++++++++++++++++++++++++++++++++++')
            });
            this.telemetryArchive.on("error", () => {
                console.log('error+++++++++++++++++++++++++++++++++++++')
            });
            this.telemetryArchive.on("finish", () => {
                console.log('finish+++++++++++++++++++++++++++++++++++++')
            });
            this.telemetryArchive.finalize();
            this.telemetryArchive.pipe(output);
        });
    }

    public async export(cb) {
        this.cb = cb;
        try {
            let fileSDK = new FileSDK("");
            let dbData = await this.databaseSdk.find("queue", {
                selector: {
                    subType: 'TELEMETRY',
                },
                fields: ['_id', 'size', 'requestHeaderObj', 'count']
            });

            if (!dbData.docs.length) {
                throw Error('No telemetry data to export');
            }

            this.telemetryArchive = fileSDK.archiver();

            let items: IItems[] = [];
            _.forEach(dbData.docs, (data) => {
                items.push({
                    objectType: 'telemetry',
                    file: `${data._id}.gz`, // relative path to file name - need to confirm
                    contentEncoding: 'gzip',
                    size: data.size,
                    explodedSize: 1,  // need to confirm
                    mid: _.get(data, 'requestHeaderObj.msgid'),
                    eventsCount: data.count
                });
                this.archiveAppend("stream", this.getStream(data._id), `${data._id}.gz`);
            })

            this.archiveAppend("buffer", this.getManifestBuffer(dbData.docs.length, items), "manifest.json");

            const data = await this.streamZip();
            console.log('====================completed', data)
            this.cb(null, data);
        } catch (error) {
            this.cb(error, null);
        }
    }
}

export interface IItems {
    objectType: string;
    file: string;
    contentEncoding: string;
    size: number;
    explodedSize: number;
    mid: string;
    eventsCount: number;
  }
