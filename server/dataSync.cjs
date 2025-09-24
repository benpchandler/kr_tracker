const fs = require('fs');
const path = require('path');

// Static table order for dependency management (parents before children)
// This defines the order for import/export to respect foreign key constraints
const STATIC_TABLE_ORDER = [
  'organizations',
  'functions', 
  'teams',
  'pods',
  'individuals',
  'objectives',
  'krs',
  'objective_teams',
  'baselines',
  'baseline_plan_values',
  'plan_values',
  'actual_values',
  'initiatives',
  'initiative_weekly',
  'app_settings'
];

// Tables to exclude from sync (system tables, etc.)
const EXCLUDED_TABLES = [
  'sqlite_sequence',
  'sqlite_master',
  'sqlite_temp_master',
  'sync_state' // Our own control table
];

function getAllUserTables(db) {
  const rows = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  return rows
    .map(r => r.name)
    .filter(name => !EXCLUDED_TABLES.includes(name));
}

function getOrderedTables(db) {
  const allTables = getAllUserTables(db);
  const ordered = [];
  const remaining = new Set(allTables);
  
  // First, add tables in our known dependency order
  for (const table of STATIC_TABLE_ORDER) {
    if (remaining.has(table)) {
      ordered.push(table);
      remaining.delete(table);
    }
  }
  
  // Then add any new tables we haven't seen before
  // (These will be added at the end, which is safest)
  for (const table of remaining) {
    ordered.push(table);
  }
  
  return ordered;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function stableRow(obj) {
  const ordered = {};
  if (Object.prototype.hasOwnProperty.call(obj, 'id')) ordered.id = obj.id;
  Object.keys(obj)
    .filter(function(k) { return k !== 'id'; })
    .sort()
    .forEach(function(k) { ordered[k] = obj[k]; });
  return ordered;
}

function writeFileIfChanged(file, content) {
  if (fs.existsSync(file)) {
    const prev = fs.readFileSync(file, 'utf8');
    if (prev === content) return false;
  }
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, file);
  return true;
}

function seedsExist(seedsDir) {
  return fs.existsSync(seedsDir) && fs.existsSync(path.join(seedsDir, 'organizations.json'));
}

function getTableColumns(db, table) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.map(function(r) { return r.name; });
}

function getOrderByClause(db, table) {
  const cols = getTableColumns(db, table);
  if (cols.includes('id')) return 'ORDER BY id';
  const sorted = cols.slice().sort();
  if (sorted.length === 0) return '';
  return 'ORDER BY ' + sorted.join(', ');
}

function exportSqliteToJson(db, opts = {}) {
  const seedsDir = opts.seedsDir;
  ensureDir(seedsDir);
  
  const tables = getOrderedTables(db);

  const meta = {
    schema: 1,
    exportedAt: new Date().toISOString(),
    tables: tables, // Track which tables were exported
    rowCounts: {}
  };

  let changes = 0;

  db.prepare('PRAGMA foreign_keys = ON').run();

  for (const table of tables) {
    const orderBy = getOrderByClause(db, table);
    const rows = db.prepare(`SELECT * FROM ${table} ${orderBy}`).all();
    const ordered = rows.map(stableRow);
    const pretty = JSON.stringify(ordered, null, 2) + '\n';
    const file = path.join(seedsDir, `${table}.json`);
    if (writeFileIfChanged(file, pretty)) changes++;
    meta.rowCounts[table] = rows.length;
  }

  writeFileIfChanged(path.join(seedsDir, '_meta.json'), JSON.stringify(meta, null, 2) + '\n');

  if (opts.logger) opts.logger.log(`Exported JSON seeds (${changes} file write(s)).`);
  return { changes };
}

function createSyncStateIfMissing(db) {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sync_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      suspended INTEGER NOT NULL DEFAULT 0,
      dirty INTEGER NOT NULL DEFAULT 0
    )
  `).run();
  db.prepare(`INSERT OR IGNORE INTO sync_state (id, suspended, dirty) VALUES (1, 0, 0)`).run();
}

function setSyncSuspended(db, suspended) {
  db.prepare(`UPDATE sync_state SET suspended = ?, dirty = CASE WHEN ? THEN 0 ELSE dirty END WHERE id = 1`).run(suspended ? 1 : 0, suspended ? 1 : 0);
}

function clearDirty(db) {
  db.prepare(`UPDATE sync_state SET dirty = 0 WHERE id = 1`).run();
}

function isDirty(db) {
  const row = db.prepare(`SELECT dirty FROM sync_state WHERE id = 1`).get();
  return row && row.dirty === 1;
}

function dropAllSyncTriggers(db) {
  // Get all existing sync triggers dynamically
  const triggers = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='trigger' 
    AND name LIKE 'tr_sync_%'
  `).all();
  
  for (const trigger of triggers) {
    db.prepare(`DROP TRIGGER IF EXISTS ${trigger.name}`).run();
  }
}

function createSyncTriggers(db) {
  createSyncStateIfMissing(db);
  const tables = getAllUserTables(db);
  
  for (const table of tables) {
    const specs = [
      { op: 'INSERT', name: `tr_sync_${table}_insert` },
      { op: 'UPDATE', name: `tr_sync_${table}_update` },
      { op: 'DELETE', name: `tr_sync_${table}_delete` }
    ];
    for (const spec of specs) {
      try {
        db.prepare(`
          CREATE TRIGGER IF NOT EXISTS ${spec.name}
          AFTER ${spec.op} ON ${table}
          WHEN (SELECT suspended = 0 FROM sync_state WHERE id = 1)
          BEGIN
            UPDATE sync_state SET dirty = 1 WHERE id = 1;
          END
        `).run();
      } catch (error) {
        console.warn(`Failed to create trigger ${spec.name} on table ${table}:`, error.message);
      }
    }
  }
}

function resetAutoincrementSequences(db) {
  // For tables that use AUTOINCREMENT, ensure future inserts do not collide.
  try {
    const seqTables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'`).get();
    if (!seqTables) return;
  } catch (e) {
    return;
  }
  
  const tables = getAllUserTables(db);
  for (const table of tables) {
    try {
      db.prepare(`UPDATE sqlite_sequence SET seq = (SELECT COALESCE(MAX(id), 0) FROM ${table}) WHERE name = ?`).run(table);
    } catch (e) {
      // Table might not have AUTOINCREMENT; ignore
    }
  }
}

function importJsonToSqlite(db, opts = {}) {
  const seedsDir = opts.seedsDir;
  const logger = opts.logger || console;
  
  const orderedTables = getOrderedTables(db);
  const deleteOrder = [...orderedTables].reverse();

  db.prepare('PRAGMA foreign_keys = OFF').run();
  createSyncStateIfMissing(db);
  setSyncSuspended(db, true);
  dropAllSyncTriggers(db);

  const trx = db.transaction(function() {
    // Clear children first
    for (const table of deleteOrder) {
      try {
        db.prepare(`DELETE FROM ${table}`).run();
      } catch (error) {
        console.warn(`Failed to clear table ${table}:`, error.message);
      }
    }

    // Insert parents first  
    for (const table of orderedTables) {
      const file = path.join(seedsDir, `${table}.json`);
      if (!fs.existsSync(file)) continue;
      const rows = readJson(file);
      if (!Array.isArray(rows)) continue;
      if (rows.length === 0) continue;

      const cols = Object.keys(rows[0]);
      const placeholders = cols.map(function() { return '?'; }).join(', ');
      const stmt = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`);

      for (const r of rows) {
        const vals = cols.map(function(c) { return r[c]; });
        stmt.run(vals);
      }
    }

    resetAutoincrementSequences(db);
  });

  trx();

  db.prepare('PRAGMA foreign_keys = ON').run();
  setSyncSuspended(db, false);
  createSyncTriggers(db);
  clearDirty(db);

  logger.log('Imported JSON seeds into SQLite.');
}

function initAutoExportOnChange(db, opts = {}) {
  const seedsDir = opts.seedsDir;
  const debounceMs = opts.debounceMs || 1500;
  const logger = opts.logger || console;

  createSyncStateIfMissing(db);
  createSyncTriggers(db);

  let exporting = false;
  let scheduled = false;

  function doExport() {
    if (exporting) {
      scheduled = true;
      return;
    }
    exporting = true;
    try {
      exportSqliteToJson(db, { seedsDir, logger });
      clearDirty(db);
    } finally {
      exporting = false;
      if (scheduled) {
        scheduled = false;
        setTimeout(doExport, debounceMs);
      }
    }
  }

  setInterval(function() {
    if (isDirty(db)) {
      doExport();
    }
  }, Math.max(500, Math.min(debounceMs, 2000)));

  logger.log('Auto-export on change is active.');
}

// Schema validation function - checks if database schema has changed
function validateSchema(db, opts = {}) {
  const logger = opts.logger || console;
  const currentTables = getAllUserTables(db);
  const orderedTables = getOrderedTables(db);
  
  // Check for new tables not in our known order
  const unknownTables = currentTables.filter(table => !STATIC_TABLE_ORDER.includes(table));
  if (unknownTables.length > 0) {
    logger.warn(`⚠️  New tables detected: ${unknownTables.join(', ')}`);
    logger.warn('   These will be synced but added at the end of dependency order.');
    logger.warn('   Consider updating STATIC_TABLE_ORDER if they have dependencies.');
  }
  
  return {
    currentTables,
    orderedTables, 
    unknownTables,
    hasNewTables: unknownTables.length > 0
  };
}

module.exports = {
  getAllUserTables,
  getOrderedTables,
  validateSchema,
  exportSqliteToJson,
  importJsonToSqlite,
  initAutoExportOnChange,
  createSyncTriggers,
  createSyncStateIfMissing,
  seedsExist
};
