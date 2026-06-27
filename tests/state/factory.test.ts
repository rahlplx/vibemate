import { describe, it, expect } from 'bun:test';
import { isBun, isNode, createSQLiteAdapter } from '../../src/state/factory.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Runtime Detector', () => {
  it('detects Bun runtime', () => {
    // Running in Bun test runner, so isBun should be true
    expect(isBun()).toBe(true);
  });

  it('isNode returns false in Bun', () => {
    expect(isNode()).toBe(false);
  });
});

describe('createSQLiteAdapter', () => {
  it('creates BunSQLiteAdapter in Bun runtime', () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'factory-test-'));
    try {
      const adapter = createSQLiteAdapter(join(tempDir, 'test.db'));
      expect(adapter).toBeDefined();
      // Verify it works
      adapter.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)');
      adapter.close();
    } finally {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // Windows file lock
      }
    }
  });
});
