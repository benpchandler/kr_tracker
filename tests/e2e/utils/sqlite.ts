import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DB_PATH = path.resolve(__dirname, '../../../server/kr.sqlite');

const runSqlite = (args: string[]) => execFileSync('sqlite3', args, {
  encoding: 'utf8',
}).trim();

export const querySqliteJson = <T = any>(sql: string): T[] => {
  const output = runSqlite(['-json', DB_PATH, sql]);
  if (!output) {
    return [];
  }
  return JSON.parse(output) as T[];
};

export const execSqlite = (sql: string): void => {
  runSqlite([DB_PATH, sql]);
};

export const escapeSqlString = (value: string): string => value.replace(/'/g, "''");
