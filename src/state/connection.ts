import { BunSQLiteDatabase } from './bun-sqlite.js';

export interface DatabaseConnection {
  db: BunSQLiteDatabase;
  path: string;
}

export function createConnection(dbPath: string): DatabaseConnection {
  const db = new BunSQLiteDatabase(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');

  return { db, path: dbPath };
}

export function closeConnection(conn: DatabaseConnection): void {
  conn.db.close();
}
