import { Database } from 'bun:sqlite';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Bindable = any;

class Statement {
  private db: Database;
  private sql: string;

  constructor(db: Database, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  run(...params: Bindable[]): { changes: number; lastInsertRowid: number } {
    const result = this.db.run(this.sql, ...params);
    return {
      changes: result.changes,
      lastInsertRowid: Number(result.lastInsertRowid),
    };
  }

  get<T = Record<string, unknown>>(...params: Bindable[]): T | undefined {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.db.query(this.sql).get(...params) as any as T) ?? undefined;
  }

  all<T = Record<string, unknown>>(...params: Bindable[]): T[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (this.db.query(this.sql).all(...params) as any as T[]);
  }
}

export class BunSQLiteDatabase {
  private db: Database;

  constructor(path: string) {
    this.db = new Database(path);
  }

  prepare(sql: string): Statement {
    return new Statement(this.db, sql);
  }

  exec(sql: string): void {
    this.db.exec(sql);
  }

  pragma(pragma: string, options?: { simple?: boolean }): unknown {
    try {
      this.db.run(`PRAGMA ${pragma}`);
      if (options?.simple) {
        const row = this.db.query(`PRAGMA ${pragma}`).get() as Record<string, unknown>;
        if (row && typeof row === 'object') {
          const key = Object.keys(row)[0];
          return row[key];
        }
        return row;
      }
      return this.db.query(`PRAGMA ${pragma}`).get();
    } catch (error) {
      console.error(`[BunSQLite] PrAGMA write failed: ${error instanceof Error ? error.message : 'Unknown error'}, falling back to read-only query`);
      return this.db.query(`PRAGMA ${pragma}`).get();
    }
  }

  close(): void {
    this.db.close();
  }
}
