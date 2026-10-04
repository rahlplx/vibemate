// Vibemate Connection Pool Module
// Provides connection pooling for SQLite and HTTP

export interface PoolConfig {
  min: number;
  max: number;
  idleTimeoutMs: number;
  acquireTimeoutMs: number;
}

export interface PoolStats {
  total: number;
  active: number;
  idle: number;
  waiting: number;
  created: number;
  destroyed: number;
}

export class ConnectionPool<T> {
  private config: PoolConfig;
  private available: T[] = [];
  private active: Set<T> = new Set();
  private waiting: Array<{
    resolve: (conn: T) => void;
    reject: (err: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = [];
  private creating = false;
  private stats: PoolStats = {
    total: 0,
    active: 0,
    idle: 0,
    waiting: 0,
    created: 0,
    destroyed: 0,
  };
  private factory: () => Promise<T>;
  private destroyer: (conn: T) => Promise<void>;

  constructor(
    factory: () => Promise<T>,
    destroyer: (conn: T) => Promise<void>,
    config?: Partial<PoolConfig>
  ) {
    this.factory = factory;
    this.destroyer = destroyer;
    this.config = {
      min: 5,
      max: 50,
      idleTimeoutMs: 30000,
      acquireTimeoutMs: 5000,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    for (let i = 0; i < this.config.min; i++) {
      const conn = await this.factory();
      this.available.push(conn);
      this.stats.total++;
      this.stats.created++;
    }
    this.updateStats();
  }

  async acquire(): Promise<T> {
    // Try to get an idle connection
    if (this.available.length > 0) {
      const conn = this.available.pop()!;
      this.active.add(conn);
      this.updateStats();
      return conn;
    }

    // Create new connection if under limit (with mutex)
    if (this.stats.total < this.config.max && !this.creating) {
      this.creating = true;
      try {
        if (this.stats.total < this.config.max) {
          const conn = await this.factory();
          this.active.add(conn);
          this.stats.total++;
          this.stats.created++;
          this.updateStats();
          return conn;
        }
      } finally {
        this.creating = false;
      }
    }

    // Wait for a connection to become available
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        // Performance: Use indexed loop instead of findIndex closure allocation
        const len = this.waiting.length;
        for (let i = 0; i < len; i++) {
          if (this.waiting[i].resolve === resolve) {
            this.waiting.splice(i, 1);
            break;
          }
        }
        this.updateStats();
        reject(new Error('Acquire timeout'));
      }, this.config.acquireTimeoutMs);

      this.waiting.push({ resolve, reject, timeout });
      this.updateStats();
    });
  }

  async release(conn: T): Promise<void> {
    this.active.delete(conn);

    // If there are waiting requests, give directly
    if (this.waiting.length > 0) {
      const waiter = this.waiting.shift()!;
      clearTimeout(waiter.timeout);
      this.active.add(conn);
      waiter.resolve(conn);
      this.updateStats();
      return;
    }

    // Otherwise, add to available pool
    this.available.push(conn);
    this.updateStats();
  }

  async destroy(): Promise<void> {
    // Teardown available connections
    const availableConns = this.available;
    this.available = [];
    for (let i = 0; i < availableConns.length; i++) {
      await this.destroyer(availableConns[i]);
      this.stats.destroyed++;
    }

    // Teardown active connections
    const activeConns = Array.from(this.active);
    this.active.clear();
    for (let i = 0; i < activeConns.length; i++) {
      await this.destroyer(activeConns[i]);
      this.stats.destroyed++;
    }

    // Reject all waiters and clear timeouts
    const waiters = this.waiting;
    this.waiting = [];
    for (let i = 0; i < waiters.length; i++) {
      const waiter = waiters[i];
      clearTimeout(waiter.timeout);
      waiter.reject(new Error('Pool destroyed'));
    }

    this.stats.total = 0;
    this.updateStats();
  }

  private updateStats(): void {
    this.stats.active = this.active.size;
    this.stats.idle = this.available.length;
    this.stats.waiting = this.waiting.length;
  }

  getStats(): PoolStats {
    this.updateStats();
    return { ...this.stats };
  }

  getAvailable(): number {
    return this.available.length;
  }

  getActive(): number {
    return this.active.size;
  }

  getWaiting(): number {
    return this.waiting.length;
  }
}
