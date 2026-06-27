import { Database } from 'bun:sqlite';

class Statement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private db: any;
  private sql: string;

  constructor(db: Database, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(...params: any[]): { changes: number; lastInsertRowid: number } {
    return this.db.run(this.sql, ...params);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(...params: any[]): unknown {
    return this.db.query(this.sql).get(...params) ?? undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all(...params: any[]): unknown[] {
    return this.db.query(this.sql).all(...params);
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
    } catch {
      return this.db.query(`PRAGMA ${pragma}`).get();
    }
  }

  close(): void {
    this.db.close();
  }
}
