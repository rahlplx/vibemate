import Database from 'better-sqlite3';

export interface DatabaseConnection {
  db: Database.Database;
  path: string;
}

export function createConnection(dbPath: string): DatabaseConnection {
  const db = new Database(dbPath);

  // Enable WAL mode for concurrent reads during writes
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = -64000'); // 64MB cache
  db.pragma('temp_store = MEMORY');

  return { db, path: dbPath };
}

export function closeConnection(conn: DatabaseConnection): void {
  conn.db.close();
}
