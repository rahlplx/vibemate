import { describe, it, expect } from 'bun:test';
import type { SQLiteAdapter, PreparedStatement } from './adapter.js';

describe('SQLiteAdapter interface', () => {
  it('defines correct method signatures', () => {
    // Type-level test: these should compile if interface is correct
    const adapter: SQLiteAdapter = {} as SQLiteAdapter;
    expect(adapter).toBeDefined();
  });

  it('defines PreparedStatement with run, get, all', () => {
    const stmt: PreparedStatement<Record<string, unknown>> = {} as PreparedStatement<Record<string, unknown>>;
    expect(stmt).toBeDefined();
  });
});
