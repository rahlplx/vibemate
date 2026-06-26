// Vibemate Cache Module
// Provides LRU cache with TTL support

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  enableStats: boolean;
}

export interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  hits: number;
  lastAccess: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export class LRUCache<T> {
  private config: CacheConfig;
  private cache: Map<string, CacheEntry<T>> = new Map();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0,
  };

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 60000, // 1 minute
      enableStats: true,
      ...config,
    };
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Check TTL
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return undefined;
    }

    // Update access stats
    entry.hits++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);

    this.cache.set(key, {
      key,
      value,
      expiresAt,
      hits: 0,
      lastAccess: Date.now(),
    });

    this.stats.size = this.cache.size;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.size = this.cache.size;
      return false;
    }

    entry.lastAccess = Date.now();
    entry.hits++;
    return true;
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  private evict(): void {
    // Find least recently used entry
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.stats.size = this.cache.size;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getSize(): number {
    return this.cache.size;
  }

  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
    this.stats.size = this.cache.size;
  }

  keys(): string[] {
    const now = Date.now();
    return Array.from(this.cache.entries())
      .filter(([_, entry]) => now <= entry.expiresAt)
      .map(([key]) => key);
  }

  values(): T[] {
    return Array.from(this.cache.entries())
      .filter(([_, entry]) => Date.now() <= entry.expiresAt)
      .map(([_, entry]) => entry.value);
  }

  entries(): Array<[string, T]> {
    return Array.from(this.cache.entries())
      .filter(([_, entry]) => Date.now() <= entry.expiresAt)
      .map(([key, entry]) => [key, entry.value]);
  }
}
