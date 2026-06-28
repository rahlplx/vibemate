import { describe, it, expect, beforeEach } from 'bun:test';
import { ConnectionPool } from '../../src/scaling/connection-pool';

describe('ConnectionPool', () => {
  let pool: ConnectionPool<{ id: number }>;
  let connectionId = 0;

  beforeEach(() => {
    connectionId = 0;
    pool = new ConnectionPool(
      async () => ({ id: connectionId++ }),
      async () => {},
      { min: 2, max: 5, idleTimeoutMs: 1000, acquireTimeoutMs: 1000 }
    );
  });

  it('should initialize with min connections', async () => {
    await pool.initialize();
    expect(pool.getStats().total).toBe(2);
    expect(pool.getAvailable()).toBe(2);
  });

  it('should acquire a connection', async () => {
    await pool.initialize();
    const conn = await pool.acquire();
    expect(conn).toBeDefined();
    expect(pool.getActive()).toBe(1);
    expect(pool.getAvailable()).toBe(1);
  });

  it('should release a connection', async () => {
    await pool.initialize();
    const conn = await pool.acquire();
    await pool.release(conn);
    expect(pool.getActive()).toBe(0);
    expect(pool.getAvailable()).toBe(2);
  });

  it('should create new connection when pool is empty', async () => {
    await pool.initialize();
    const conn1 = await pool.acquire();
    const conn2 = await pool.acquire();
    const conn3 = await pool.acquire();
    expect(pool.getStats().total).toBe(3);
    expect(pool.getActive()).toBe(3);
  });

  it('should not exceed max connections', async () => {
    await pool.initialize();
    const connections = [];
    for (let i = 0; i < 5; i++) {
      connections.push(await pool.acquire());
    }
    expect(pool.getStats().total).toBe(5);
    expect(pool.getActive()).toBe(5);
  });

  it('should return stats', async () => {
    await pool.initialize();
    const stats = pool.getStats();
    expect(stats).toHaveProperty('total');
    expect(stats).toHaveProperty('active');
    expect(stats).toHaveProperty('idle');
    expect(stats).toHaveProperty('waiting');
    expect(stats).toHaveProperty('created');
    expect(stats).toHaveProperty('destroyed');
  });

  it('should destroy all connections', async () => {
    await pool.initialize();
    await pool.acquire();
    await pool.destroy();
    expect(pool.getStats().total).toBe(0);
  });

  it('should reject with acquire timeout when pool is at max and no connection released', async () => {
    const tinyPool = new ConnectionPool(
      async () => ({ id: connectionId++ }),
      async () => {},
      { min: 1, max: 1, idleTimeoutMs: 1000, acquireTimeoutMs: 50 }
    );
    await tinyPool.initialize();
    const held = await tinyPool.acquire(); // occupies the only slot
    void held; // prevent unused warning
    await expect(tinyPool.acquire()).rejects.toThrow('Acquire timeout');
    await tinyPool.destroy();
  }, 2000);
});
