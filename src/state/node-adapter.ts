/**
 * Node.js SQLite adapter using better-sqlite3.
 *
 * IMPORTANT: This adapter requires better-sqlite3 to be installed.
 * On Windows, better-sqlite3 requires Visual Studio Build Tools.
 * On macOS/Linux, it requires python3 and build-essential.
 *
 * Installation: npm install better-sqlite3 @types/better-sqlite3
 *
 * This adapter is NOT imported by default to avoid breaking Bun environments.
 * Use the factory (createSQLiteAdapter) to get the correct adapter at runtime.
 */

import type { SQLiteAdapter, PreparedStatement } from './adapter.js';

class NodePreparedStatement<T> implements PreparedStatement<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private stmt: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(stmt: any) {
    this.stmt = stmt;
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const result = this.stmt.run(...params);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  }

  get(...params: unknown[]): T | undefined {
    return this.stmt.get(...params) as T | undefined;
  }

  all(...params: unknown[]): T[] {
    return this.stmt.all(...params) as T[];
  }
}

export class NodeSQLiteAdapter implements SQLiteAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;

  constructor(path: string) {
    // Dynamic import to avoid breaking Bun environments
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('cache_size = -64000');
    this.db.pragma('temp_store = MEMORY');
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
    const stmt = this.db.prepare(sql);
    return params ? stmt.all(...params) as T[] : stmt.all() as T[];
  }

  prepare<T = Record<string, unknown>>(sql: string): PreparedStatement<T> {
    return new NodePreparedStatement<T>(this.db.prepare(sql));
  }

  transaction<T>(fn: () => T): T {
    const transaction = this.db.transaction(fn);
    return transaction();
  }

  close(): void {
    this.db.close();
  }
}
