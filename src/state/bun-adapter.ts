import { Database } from 'bun:sqlite';
import type { SQLiteAdapter, PreparedStatement } from './adapter.js';

class BunPreparedStatement<T> implements PreparedStatement<T> {
  private stmt: ReturnType<Database['prepare']>;

  constructor(stmt: ReturnType<Database['prepare']>) {
    this.stmt = stmt;
  }

  run(...params: unknown[]): { changes: number; lastInsertRowid: number } {
    const result = this.stmt.run(...params as []);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  }

  get(...params: unknown[]): T | undefined {
    return this.stmt.get(...params as []) as T | undefined;
  }

  all(...params: unknown[]): T[] {
    return this.stmt.all(...params as []) as T[];
  }
}

export class BunSQLiteAdapter implements SQLiteAdapter {
  private db: Database;

  constructor(path: string) {
    this.db = new Database(path);
    this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA synchronous = NORMAL');
    this.db.exec('PRAGMA cache_size = -64000');
    this.db.exec('PRAGMA temp_store = MEMORY');
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
    const stmt = this.db.prepare(sql);
    return params ? (stmt.all(...params as []) as T[]) : (stmt.all() as T[]);
  }

  prepare<T = Record<string, unknown>>(sql: string): PreparedStatement<T> {
    return new BunPreparedStatement<T>(this.db.prepare(sql));
  }

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  close(): void {
    this.db.close();
  }
}
