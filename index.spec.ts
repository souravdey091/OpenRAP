import { DataBaseSDK } from './sdks/DataBaseSDK';
import * as fs from 'fs';
import * as path from 'path';
import { expect } from 'chai';
import { App } from './index';


const data = 'test data'

describe('Index file', () => {

  xit('should create databases', (done) => {
    process.env.DATABASE_PATH = __dirname;
    let schema = JSON.parse(fs.readFileSync(path.join(__dirname, 'db', 'schemas.json'), { encoding: 'utf8' }))
    let databases = schema.databases;
    App.bootstrap()
      .then(() => {
        let dataBase = new DataBaseSDK();
      }).then((dbs) => {

        done()
      })
  });

});