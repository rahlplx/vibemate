import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { BunSQLiteAdapter } from './bun-adapter.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('BunSQLiteAdapter', () => {
  let tempDir: string;
  let adapter: BunSQLiteAdapter;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'bun-adapter-test-'));
    adapter = new BunSQLiteAdapter(join(tempDir, 'test.db'));
  });

  afterEach(() => {
    adapter.close();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Windows may hold file locks briefly
    }
  });

  it('exec creates tables', () => {
    adapter.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    // Verify table exists by inserting
    const stmt = adapter.prepare<{ id: number; name: string }>('INSERT INTO test (name) VALUES (?)');
    stmt.run('hello');
    const row = adapter.query<{ id: number; name: string }>('SELECT * FROM test WHERE name = ?', ['hello']);
    expect(row).toHaveLength(1);
    expect(row[0].name).toBe('hello');
  });

  it('query returns results', () => {
    adapter.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, value TEXT)');
    adapter.prepare('INSERT INTO items (value) VALUES (?)').run('a');
    adapter.prepare('INSERT INTO items (value) VALUES (?)').run('b');
    const results = adapter.query<{ id: number; value: string }>('SELECT * FROM items ORDER BY id');
    expect(results).toHaveLength(2);
    expect(results[0].value).toBe('a');
    expect(results[1].value).toBe('b');
  });

  it('prepare creates working statements', () => {
    adapter.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE)');
    const stmt = adapter.prepare<{ id: number; email: string }>('INSERT INTO users (email) VALUES (?)');
    const result = stmt.run('test@example.com');
    expect(result.changes).toBe(1);
    expect(result.lastInsertRowid).toBe(1);
  });

  it('transaction commits on success', () => {
    adapter.exec('CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER)');
    adapter.transaction(() => {
      adapter.prepare('INSERT INTO accounts (balance) VALUES (?)').run(100);
      adapter.prepare('INSERT INTO accounts (balance) VALUES (?)').run(200);
    });
    const rows = adapter.query<{ id: number; balance: number }>('SELECT * FROM accounts');
    expect(rows).toHaveLength(2);
  });

  it('transaction rolls back on error', () => {
    adapter.exec('CREATE TABLE accounts (id INTEGER PRIMARY KEY, balance INTEGER)');
    try {
      adapter.transaction(() => {
        adapter.prepare('INSERT INTO accounts (balance) VALUES (?)').run(100);
        throw new Error('rollback');
      });
    } catch {
      // Expected
    }
    const rows = adapter.query<{ id: number; balance: number }>('SELECT * FROM accounts');
    expect(rows).toHaveLength(0);
  });
});
