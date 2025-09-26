const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'kr.sqlite');
const SEEDS_DIR = path.join(__dirname, 'seeds', 'json');
const SNAPSHOT_PREFIX = 'kr.sqlite.bak-';

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

const EXCLUDED_TABLES = [
  'sqlite_sequence',
  'sqlite_master',
  'sqlite_temp_master',
  'sync_state'
];

const logger = {
  info(message) {
    console.log(`[backup] ${message}`);
  },
  warn(message, err) {
    if (err) {
      console.warn(`[backup] ${message}`, err);
    } else {
      console.warn(`[backup] ${message}`);
    }
  },
  error(message, err) {
    if (err) {
      console.error(`[backup] ${message}`, err);
    } else {
      console.error(`[backup] ${message}`);
    }
  }
};

// --- Queue/flag handling ---------------------------------------------------
const jobQueue = [];
let isProcessing = false;
let lastSnapshotDate = null;

function enqueue(task) {
  return new Promise((resolve, reject) => {
    jobQueue.push({ task, resolve, reject });
    if (!isProcessing) processQueue();
  });
}

function processQueue() {
  if (isProcessing) return;
  const job = jobQueue.shift();
  if (!job) return;
  isProcessing = true;

  let result;
  try {
    result = job.task();
  } catch (err) {
    job.reject(err);
    isProcessing = false;
    setImmediate(processQueue);
    return;
  }

  Promise.resolve(result)
    .then((value) => {
      job.resolve(value);
    })
    .catch((err) => {
      job.reject(err);
    })
    .finally(() => {
      isProcessing = false;
      processQueue();
    });
}

function ensureDir(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function getUserTables(db) {
  const rows = db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type='table'
    AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  return rows
    .map((row) => row.name)
    .filter((name) => !EXCLUDED_TABLES.includes(name));
}

function getOrderedTables(db) {
  const allTables = getUserTables(db);
  const ordered = [];
  const remaining = new Set(allTables);

  for (const table of STATIC_TABLE_ORDER) {
    if (remaining.has(table)) {
      ordered.push(table);
      remaining.delete(table);
    }
  }

  for (const table of remaining) {
    ordered.push(table);
  }

  return ordered;
}

function stableRow(row) {
  const ordered = {};
  if (Object.prototype.hasOwnProperty.call(row, 'id')) {
    ordered.id = row.id;
  }
  Object.keys(row)
    .filter((key) => key !== 'id')
    .sort()
    .forEach((key) => {
      ordered[key] = row[key];
    });
  return ordered;
}

function getTableColumns(db, table) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.map((r) => r.name);
}

function getOrderByClause(db, table) {
  const columns = getTableColumns(db, table);
  if (columns.includes('id')) return 'ORDER BY id';
  if (columns.length === 0) return '';
  const sorted = columns.slice().sort();
  return `ORDER BY ${sorted.join(', ')}`;
}

function writeFileIfChanged(file, content) {
  if (fs.existsSync(file)) {
    const previous = fs.readFileSync(file, 'utf8');
    if (previous === content) return false;
  }
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, file);
  return true;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function exportSeeds(db) {
  // --- Export phase --------------------------------------------------------
  ensureDir(SEEDS_DIR);

  const tables = getOrderedTables(db);
  const meta = {
    schema: 1,
    exportedAt: new Date().toISOString(),
    tables,
    rowCounts: {}
  };

  let filesWritten = 0;

  db.prepare('PRAGMA foreign_keys = ON').run();

  for (const table of tables) {
    const orderBy = getOrderByClause(db, table);
    const rows = db.prepare(`SELECT * FROM ${table} ${orderBy}`).all();
    const orderedRows = rows.map(stableRow);
    const fileContent = JSON.stringify(orderedRows, null, 2) + '\n';
    const targetFile = path.join(SEEDS_DIR, `${table}.json`);
    if (writeFileIfChanged(targetFile, fileContent)) filesWritten++;
    meta.rowCounts[table] = rows.length;
  }

  const metaFile = path.join(SEEDS_DIR, '_meta.json');
  writeFileIfChanged(metaFile, JSON.stringify(meta, null, 2) + '\n');

  return { tables, filesWritten };
}

function ensureDailySnapshot(db) {
  // --- Backup copy phase ---------------------------------------------------
  const todayKey = formatDate(new Date());
  const snapshotName = `${SNAPSHOT_PREFIX}${todayKey}`;
  const snapshotPath = path.join(__dirname, snapshotName);

  if (lastSnapshotDate === todayKey && fs.existsSync(snapshotPath)) {
    return { created: false, path: snapshotPath };
  }

  try {
    db.pragma('wal_checkpoint(TRUNCATE)');
  } catch (err) {
    logger.warn('Failed to checkpoint WAL before snapshot', err);
  }

  fs.copyFileSync(DB_PATH, snapshotPath);
  lastSnapshotDate = todayKey;

  return { created: true, path: snapshotPath };
}

function performBackup() {
  const startedAt = Date.now();
  let db;
  try {
    db = new Database(DB_PATH);
    const exportResult = exportSeeds(db);
    const snapshotResult = ensureDailySnapshot(db);
    const durationMs = Date.now() - startedAt;
    logger.info(
      `Backup complete in ${durationMs}ms; ${exportResult.filesWritten} seed file(s) updated; snapshot ${snapshotResult.created ? 'written' : 'already current'}.`
    );
    return {
      exportedTables: exportResult.tables.length,
      updatedSeedFiles: exportResult.filesWritten,
      snapshotPath: snapshotResult.path,
      snapshotCreated: snapshotResult.created,
      durationMs
    };
  } catch (err) {
    // --- Error handling ----------------------------------------------------
    logger.error('Backup failed', err);
    throw err;
  } finally {
    if (db) {
      try {
        db.close();
      } catch (closeErr) {
        logger.warn('Failed to close SQLite connection cleanly', closeErr);
      }
    }
  }
}

async function runBackup() {
  return enqueue(() => performBackup());
}

module.exports = {
  runBackup
};
