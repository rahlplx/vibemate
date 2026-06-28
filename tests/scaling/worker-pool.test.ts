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

  it('execute runs task and returns result', async () => {
    const pool = new WorkerPool({ minWorkers: 1, maxWorkers: 2, taskTimeoutMs: 5000 });
    await pool.initialize(workerScript);
    const result = await pool.execute<number, { result: number }>(workerScript, 5);
    expect(result).toEqual({ result: 10 });
    await pool.terminate();
  });

  it('execute increments tasksCompleted', async () => {
    const pool = new WorkerPool({ minWorkers: 1, maxWorkers: 2, taskTimeoutMs: 5000 });
    await pool.initialize(workerScript);
    await pool.execute(workerScript, 3);
    const stats = pool.getStats();
    expect(stats.totalTasksCompleted).toBeGreaterThanOrEqual(1);
    await pool.terminate();
  });

  it('execute spawns new worker if all busy up to maxWorkers', async () => {
    const pool = new WorkerPool({ minWorkers: 1, maxWorkers: 3, taskTimeoutMs: 5000 });
    await pool.initialize(workerScript);
    // Run two tasks, the second may spawn a new worker
    const [r1, r2] = await Promise.all([
      pool.execute<number, { result: number }>(workerScript, 2),
      pool.execute<number, { result: number }>(workerScript, 4),
    ]);
    expect(r1).toEqual({ result: 4 });
    expect(r2).toEqual({ result: 8 });
    await pool.terminate();
  });

  it('processQueue resolves queued tasks after worker becomes free', async () => {
    // Write a worker that delays first response to force the second task to queue
    const delayScript = join(testDir, 'delay-worker.js');
    await writeFile(delayScript, `
      const { parentPort } = require('worker_threads');
      parentPort.on('message', (msg) => {
        if (msg && msg.delay) {
          setTimeout(() => parentPort.postMessage('done-' + msg.id), msg.delay);
        } else {
          parentPort.postMessage('done-' + (msg && msg.id || 'x'));
        }
      });
    `);

    const pool = new WorkerPool({ minWorkers: 1, maxWorkers: 1, taskTimeoutMs: 5000 });
    await pool.initialize(delayScript);

    // First task holds the worker busy for 100ms
    const first = pool.execute<{ delay: number; id: number }, string>(delayScript, { delay: 100, id: 1 });
    await new Promise(r => setTimeout(r, 20)); // let first task start
    // Second task: worker is busy, pool at maxWorkers → goes to queue
    const second = pool.execute<{ delay: number; id: number }, string>(delayScript, { delay: 0, id: 2 });

    const [r1, r2] = await Promise.all([first, second]);
    expect(r1).toBe('done-1');
    expect(r2).toBe('done-2');
    await pool.terminate();
  }, 5000);

  it('handleWorkerError rejects active task when worker throws', async () => {
    const errorScript = join(testDir, 'error-worker.js');
    await writeFile(errorScript, `
      const { parentPort } = require('worker_threads');
      parentPort.on('message', () => { throw new Error('deliberate worker error'); });
    `);

    const pool = new WorkerPool({ minWorkers: 1, maxWorkers: 1, taskTimeoutMs: 5000 });
    await pool.initialize(errorScript);

    await expect(pool.execute(errorScript, 'trigger')).rejects.toThrow('deliberate worker error');
    await pool.terminate();
  }, 5000);

  it('queue timeout rejects task when no worker available and timeout fires', async () => {
    const slowScript = join(testDir, 'slow-inf.js');
    await writeFile(slowScript, `
      const { parentPort } = require('worker_threads');
      parentPort.on('message', () => { /* never replies */ });
    `);

    // Very short taskTimeoutMs so the queued task times out quickly
    const pool = new WorkerPool({ minWorkers: 1, maxWorkers: 1, taskTimeoutMs: 80 });
    await pool.initialize(slowScript);

    // Occupy the only worker; suppress the unhandled rejection from its own timeout
    const firstTask = pool.execute(slowScript, 'hold');
    firstTask.catch(() => {});
    await new Promise(r => setTimeout(r, 20));
    // Second task queues (worker busy, at maxWorkers) and times out after its own 80ms
    const queued = pool.execute(slowScript, 'queued');
    await expect(queued).rejects.toThrow('timeout');
    pool.terminate().catch(() => {});
  }, 5000);

  it('terminate rejects pending queued tasks', async () => {
    // Write a slow worker that blocks indefinitely
    const slowScript = join(testDir, 'slow-worker.js');
    await writeFile(slowScript, `
      const { parentPort } = require('worker_threads');
      parentPort.on('message', () => {
        // never replies — keeps the worker busy
      });
    `);

    const slowPool = new WorkerPool({ minWorkers: 1, maxWorkers: 1, taskTimeoutMs: 30000 });
    await slowPool.initialize(slowScript);

    // First task occupies the only worker (direct dispatch, not queued)
    const firstTask = slowPool.execute(slowScript, 1);
    // Wait a tick so the worker is marked busy
    await new Promise(r => setTimeout(r, 20));
    // Second task: worker is busy and pool is at max → lands in the queue
    const queuedTask = slowPool.execute(slowScript, 2);
    await new Promise(r => setTimeout(r, 20));

    // Terminate should reject the queued task immediately
    slowPool.terminate().catch(() => {}); // firstTask resolve/reject doesn't matter
    await expect(queuedTask).rejects.toThrow('Pool terminated');
  });
});
