import { describe, it, expect, afterEach } from 'bun:test';
import { createConnection, closeConnection, type DatabaseConnection } from '../../src/state/connection.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_DIR = path.join(process.cwd(), '.test-state');

afterEach(async () => {
  // Allow bun:sqlite WAL files to release
  await new Promise(resolve => setTimeout(resolve, 50));
  if (fs.existsSync(TEST_DB_DIR)) {
    try {
      fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {
      // WAL file may still be locked - ignore
    }
  }
});

describe('createConnection', () => {
  it('creates a new SQLite database file', () => {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    const dbPath = path.join(TEST_DB_DIR, 'test.db');
    const conn = createConnection(dbPath);
    expect(conn).toBeDefined();
    expect(conn.db).toBeDefined();
    closeConnection(conn);
    expect(fs.existsSync(dbPath)).toBe(true);
  });

  it('enables WAL mode by default', () => {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    const dbPath = path.join(TEST_DB_DIR, 'test.db');
    const conn = createConnection(dbPath);
    const result = conn.db.pragma('journal_mode', { simple: true });
    expect(result).toBe('wal');
    closeConnection(conn);
  });

  it('sets synchronous to NORMAL', () => {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    const dbPath = path.join(TEST_DB_DIR, 'test.db');
    const conn = createConnection(dbPath);
    const result = conn.db.pragma('synchronous', { simple: true });
    expect(result).toBe(1); // NORMAL = 1
    closeConnection(conn);
  });

  it('creates in-memory database when path is :memory:', () => {
    const conn = createConnection(':memory:');
    expect(conn).toBeDefined();
    closeConnection(conn);
  });
});

describe('closeConnection', () => {
  it('closes database without error', () => {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    const dbPath = path.join(TEST_DB_DIR, 'test.db');
    const conn = createConnection(dbPath);
    expect(() => closeConnection(conn)).not.toThrow();
  });
});

describe('DatabaseConnection type', () => {
  it('has db and path properties', () => {
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    const dbPath = path.join(TEST_DB_DIR, 'test.db');
    const conn = createConnection(dbPath);
    expect(conn).toHaveProperty('db');
    expect(conn).toHaveProperty('path');
    expect(conn.path).toBe(dbPath);
    closeConnection(conn);
  });
});
