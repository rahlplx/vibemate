import { describe, it, expect, afterEach } from 'vitest';
import { runMigrations, getMigrationVersion } from '../../src/state/migrations.js';
import { createConnection, closeConnection, type DatabaseConnection } from '../../src/state/connection.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_DIR = path.join(process.cwd(), '.test-state-migrations');

afterEach(() => {
  if (fs.existsSync(TEST_DB_DIR)) {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
  }
});

function createTestConn(): DatabaseConnection {
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  return createConnection(path.join(TEST_DB_DIR, 'test.db'));
}

describe('runMigrations', () => {
  it('creates migrations table', () => {
    const conn = createTestConn();
    runMigrations(conn);
    const tables = conn.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'"
    ).all();
    expect(tables.length).toBe(1);
    closeConnection(conn);
  });

  it('creates projects table', () => {
    const conn = createTestConn();
    runMigrations(conn);
    const tables = conn.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='projects'"
    ).all();
    expect(tables.length).toBe(1);
    closeConnection(conn);
  });

  it('creates sessions table', () => {
    const conn = createTestConn();
    runMigrations(conn);
    const tables = conn.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'"
    ).all();
    expect(tables.length).toBe(1);
    closeConnection(conn);
  });

  it('creates decisions table', () => {
    const conn = createTestConn();
    runMigrations(conn);
    const tables = conn.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='decisions'"
    ).all();
    expect(tables.length).toBe(1);
    closeConnection(conn);
  });

  it('creates tasks table', () => {
    const conn = createTestConn();
    runMigrations(conn);
    const tables = conn.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'"
    ).all();
    expect(tables.length).toBe(1);
    closeConnection(conn);
  });

  it('creates observations table', () => {
    const conn = createTestConn();
    runMigrations(conn);
    const tables = conn.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='observations'"
    ).all();
    expect(tables.length).toBe(1);
    closeConnection(conn);
  });

  it('is idempotent - running twice does not error', () => {
    const conn = createTestConn();
    expect(() => {
      runMigrations(conn);
      runMigrations(conn);
    }).not.toThrow();
    closeConnection(conn);
  });

  it('records migration version', () => {
    const conn = createTestConn();
    runMigrations(conn);
    const version = getMigrationVersion(conn);
    expect(version).toBe(1);
    closeConnection(conn);
  });
});

describe('getMigrationVersion', () => {
  it('returns 0 for unmigrated database', () => {
    const conn = createTestConn();
    const version = getMigrationVersion(conn);
    expect(version).toBe(0);
    closeConnection(conn);
  });

  it('returns 1 after migration', () => {
    const conn = createTestConn();
    runMigrations(conn);
    const version = getMigrationVersion(conn);
    expect(version).toBe(1);
    closeConnection(conn);
  });
});
