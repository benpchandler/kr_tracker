const path = require('path');
const Database = require('better-sqlite3');
const { exportSqliteToJson } = require('../server/dataSync.cjs');

const dbPath = path.join(__dirname, '..', 'server', 'kr.sqlite');
const seedsDir = path.join(__dirname, '..', 'server', 'seeds', 'json');

const db = new Database(dbPath);
exportSqliteToJson(db, { seedsDir, logger: console });
db.close();