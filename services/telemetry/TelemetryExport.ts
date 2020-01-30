import * as  _ from "lodash";
import * as fs from "fs";
import * as path from "path";
import { logger } from "@project-sunbird/ext-framework-server/logger";
import { DataBaseSDK } from "../../sdks/DataBaseSDK";
import { Inject, Singleton } from "typescript-ioc";
import FileSDK from "../../sdks/FileSDK";
import { Readable } from 'stream';
import SettingSDK from '../../sdks/SettingSDK'

@Singleton
export class TelemetryExport {
    @Inject private databaseSdk: DataBaseSDK;
    @Inject private settingSDK: SettingSDK;
    private telemetryArchive;
    private cb;
    private destFolder: string;

    public async export(destFolder: string, cb) {
        this.destFolder = destFolder;
        this.cb = cb;
        try {
            if (!this.destFolder) {
                throw Error('Destination folder not provided for export');
            }
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
                    file: `${data._id}.gz`,
                    contentEncoding: 'gzip',
                    size: data.size,
                    explodedSize: data.size,
                    mid: _.get(data, 'requestHeaderObj.msgid'),
                    eventsCount: data.count
                });
                this.archiveAppend("stream", this.getStream(data._id), `${data._id}.gz`);
            })

            this.archiveAppend("buffer", this.getManifestBuffer(dbData.docs.length, items), "manifest.json");
            await this.streamZip();
            this.cb(null, 'success');
        } catch (error) {
            this.cb(error, null);
        }
    }

    private getStream(id: string) {
        let getData = (id: string) => {
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
                    this.push(err)
                    this.push(null)
                })
            }
        });
        return inStream;
    }

    private archiveAppend(type, src, dest) {
        if (type === "path") {
            this.telemetryArchive.append(fs.createReadStream(src), { name: dest });
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
            ver: process.env.APP_VERSION,
            ts: new Date(),
            producer: {
                id: process.env.APP_ID,
                ver: process.env.APP_VERSION,
                pid: "desktop.app"
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
            const filePath = path.join(this.destFolder, 'telemetry.zip');
            const output = fs.createWriteStream(filePath);
            output.on("close", () => resolve({}));
            this.telemetryArchive.on("end", () => {
                logger.log("Data has been zipped");
                this.settingSDK.put('telemetryExportedInfo', { lastExportedOn: Date.now() });
            });
            this.telemetryArchive.on("error", reject);
            this.telemetryArchive.finalize();
            this.telemetryArchive.pipe(output);
        });
    }

    public async info(cb) {
        this.cb = cb;
        try {
            let dbData = await this.databaseSdk.find("queue", {
                selector: { subType: 'TELEMETRY' },
                fields: ['size']
            });

            let totalSize: number = 0;
            if (dbData.docs.length) {
                _.forEach(dbData.docs, (data) => {
                    totalSize += data.size;
                })
            }

            let exportedDate;
            try {
                exportedDate = await this.settingSDK.get('telemetryExportedInfo');
            } catch (error) {
                exportedDate = { lastExportedOn: null };
            }
            this.cb(null, { totalSize: totalSize, lastExportedOn: exportedDate.lastExportedOn });
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
