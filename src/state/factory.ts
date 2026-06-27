import type { SQLiteAdapter } from './adapter.js';

export function isBun(): boolean {
  return typeof globalThis.Bun !== 'undefined';
}

export function isNode(): boolean {
  return typeof process !== 'undefined' && !!process.versions?.node && !isBun();
}

export function createSQLiteAdapter(path: string): SQLiteAdapter {
  if (isBun()) {
    // Bun runtime - use bun:sqlite
    const { BunSQLiteAdapter } = require('./bun-adapter.js');
    return new BunSQLiteAdapter(path);
  }

  if (isNode()) {
    // Node.js runtime - use better-sqlite3
    try {
      const { NodeSQLiteAdapter } = require('./node-adapter.js');
      return new NodeSQLiteAdapter(path);
    } catch {
      throw new Error(
        'better-sqlite3 is required for Node.js runtime. ' +
        'Install it with: npm install better-sqlite3 @types/better-sqlite3'
      );
    }
  }

  throw new Error('Unsupported runtime: neither Bun nor Node.js detected');
}
