const path = require('path');
const Database = require('better-sqlite3');
const { validateSchema } = require('../server/dataSync.cjs');

const dbPath = path.join(__dirname, '..', 'server', 'kr.sqlite');

try {
  const db = new Database(dbPath);
  const schemaInfo = validateSchema(db, { logger: console });
  
  if (schemaInfo.hasNewTables) {
    console.log('🔄 Schema changes detected - ensuring sync system is up to date...');
    // The export-seeds script will handle the actual export
  } else {
    console.log('✅ Database schema is in sync');
  }
  
  db.close();
  process.exit(0);
} catch (error) {
  console.error('❌ Schema validation failed:', error.message);
  process.exit(1);
}