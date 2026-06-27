import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { WorkerPool } from '../../src/scaling/worker-pool.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('WorkerPool', () => {
  let testDir: string;
  let workerScript: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `worker-pool-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    workerScript = join(testDir, 'worker.js');
    await writeFile(workerScript, `
      const { parentPort } = require('worker_threads');
      parentPort.on('message', (msg) => {
        parentPort.postMessage({ result: msg * 2 });
      });
    `);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it('creates pool with default config', () => {
    const pool = new WorkerPool();
    const stats = pool.getStats();
    expect(stats.totalWorkers).toBe(0);
    expect(stats.busyWorkers).toBe(0);
    expect(stats.idleWorkers).toBe(0);
    expect(stats.queueSize).toBe(0);
    expect(stats.totalTasksCompleted).toBe(0);
  });

  it('creates pool with custom config', () => {
    const pool = new WorkerPool({ minWorkers: 1, maxWorkers: 4 });
    expect(pool).toBeDefined();
  });

  it('initializes with min workers', async () => {
    const pool = new WorkerPool({ minWorkers: 2 });
    await pool.initialize(workerScript);
    const stats = pool.getStats();
    expect(stats.totalWorkers).toBe(2);
    await pool.terminate();
  });

  it('terminates all workers', async () => {
    const pool = new WorkerPool({ minWorkers: 1 });
    await pool.initialize(workerScript);
    await pool.terminate();
    const stats = pool.getStats();
    expect(stats.totalWorkers).toBe(0);
  });

  it('returns correct stats structure', () => {
    const pool = new WorkerPool();
    const stats = pool.getStats();
    expect(typeof stats.totalWorkers).toBe('number');
    expect(typeof stats.busyWorkers).toBe('number');
    expect(typeof stats.idleWorkers).toBe('number');
    expect(typeof stats.queueSize).toBe('number');
    expect(typeof stats.totalTasksCompleted).toBe('number');
  });
});
