const fs = require('fs');
const path = require('path');

const TABLES = [
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

const IMPORT_ORDER = TABLES; // parents before children
const DELETE_ORDER = [...TABLES].reverse();

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

  const meta = {
    schema: 1,
    exportedAt: new Date().toISOString(),
    rowCounts: {}
  };

  let changes = 0;

  db.prepare('PRAGMA foreign_keys = ON').run();

  for (const table of TABLES) {
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

function dropSyncTriggers(db) {
  for (const table of TABLES) {
    for (const op of ['insert', 'update', 'delete']) {
      const name = `tr_sync_${table}_${op}`;
      db.prepare(`DROP TRIGGER IF EXISTS ${name}`).run();
    }
  }
}

function createSyncTriggers(db) {
  createSyncStateIfMissing(db);
  for (const table of TABLES) {
    const specs = [
      { op: 'INSERT', name: `tr_sync_${table}_insert` },
      { op: 'UPDATE', name: `tr_sync_${table}_update` },
      { op: 'DELETE', name: `tr_sync_${table}_delete` }
    ];
    for (const spec of specs) {
      db.prepare(`
        CREATE TRIGGER IF NOT EXISTS ${spec.name}
        AFTER ${spec.op} ON ${table}
        WHEN (SELECT suspended = 0 FROM sync_state WHERE id = 1)
        BEGIN
          UPDATE sync_state SET dirty = 1 WHERE id = 1;
        END
      `).run();
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
  for (const table of TABLES) {
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

  db.prepare('PRAGMA foreign_keys = OFF').run();
  createSyncStateIfMissing(db);
  setSyncSuspended(db, true);
  dropSyncTriggers(db);

  const trx = db.transaction(function() {
    // Clear children first
    for (const table of DELETE_ORDER) {
      db.prepare(`DELETE FROM ${table}`).run();
    }

    // Insert parents first
    for (const table of IMPORT_ORDER) {
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

module.exports = {
  TABLES,
  exportSqliteToJson,
  importJsonToSqlite,
  initAutoExportOnChange,
  createSyncTriggers,
  createSyncStateIfMissing,
  seedsExist
};