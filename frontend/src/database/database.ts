import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, LOCAL_DB_NAME, NIGER_LGAS } from './LocalDatabaseSchema';

type SqlQueryResult<T = unknown> = {
  rows: {
    _array: T[];
  };
  insertId?: number | null;
  rowsAffected?: number;
};

const db = SQLite.openDatabaseSync(LOCAL_DB_NAME);

let initialized = false;

const isSelect = (sql: string) => /^\s*select/i.test(sql);

export const execute = async <T = unknown>(sql: string, params: unknown[] = []): Promise<SqlQueryResult<T>> => {
  if (isSelect(sql)) {
    const rows = await db.getAllAsync<T>(sql, params as never);
    return { rows: { _array: rows } };
  }

  const result = await db.runAsync(sql, params as never);
  return {
    rows: { _array: [] },
    insertId: result.lastInsertRowId ?? null,
    rowsAffected: result.changes ?? 0,
  };
};

export const initializeDatabase = async () => {
  if (initialized) return;

  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  for (const statement of CREATE_TABLES_SQL) {
    await db.execAsync(statement);
  }

  for (const name of NIGER_LGAS) {
    const uuid = `lga-${name.toLowerCase().replace(/\s+/g, '-')}`;
    await db.runAsync('INSERT OR IGNORE INTO lgas (uuid, name) VALUES (?, ?)', [uuid, name]);
  }

  initialized = true;
};

export const rowsToArray = <T>(result: SqlQueryResult<T>) => result.rows._array ?? [];

export const database = db;
