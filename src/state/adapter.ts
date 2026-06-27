export interface SQLiteAdapter {
  exec(sql: string): void;
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[];
  prepare<T = Record<string, unknown>>(sql: string): PreparedStatement<T>;
  transaction<T>(fn: () => T): T;
  close(): void;
}

export interface PreparedStatement<T = Record<string, unknown>> {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  get(...params: unknown[]): T | undefined;
  all(...params: unknown[]): T[];
}
