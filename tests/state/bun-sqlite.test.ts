import { describe, it, expect, afterEach } from 'bun:test';
import { BunSQLiteDatabase } from '../../src/state/bun-sqlite';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB = path.join(process.cwd(), '.test-bun-sqlite.db');

afterEach(() => {
  if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

describe('BunSQLiteDatabase', () => {
  it('creates and queries a database', () => {
    const db = new BunSQLiteDatabase(TEST_DB);
    db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    db.prepare('INSERT INTO test (name) VALUES (?)').run('hello');
    const row = db.prepare('SELECT name FROM test WHERE id = ?').get<{ name: string }>(1);
    expect(row?.name).toBe('hello');
    db.close();
  });

  it('returns typed arrays with all()', () => {
    const db = new BunSQLiteDatabase(TEST_DB);
    db.exec('CREATE TABLE items (id INTEGER PRIMARY KEY, val TEXT)');
    db.prepare('INSERT INTO items (val) VALUES (?)').run('a');
    db.prepare('INSERT INTO items (val) VALUES (?)').run('b');
    const rows = db.prepare('SELECT val FROM items').all<{ val: string }>();
    expect(rows).toHaveLength(2);
    expect(rows[0].val).toBe('a');
    db.close();
  });

  it('returns undefined for missing rows', () => {
    const db = new BunSQLiteDatabase(TEST_DB);
    db.exec('CREATE TABLE t (id INTEGER PRIMARY KEY)');
    const row = db.prepare('SELECT * FROM t WHERE id = ?').get(999);
    expect(row).toBeUndefined();
    db.close();
  });

  it('supports pragma with simple option', () => {
    const db = new BunSQLiteDatabase(TEST_DB);
    const journalMode = db.pragma('journal_mode', { simple: true });
    expect(typeof journalMode === 'string' || typeof journalMode === 'object').toBe(true);
    db.close();
  });
});
