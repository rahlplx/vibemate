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

    // Update access stats and maintain LRU order by re-inserting
    this.cache.delete(key);
    entry.hits++;
    entry.lastAccess = Date.now();
    this.cache.set(key, entry);

    this.stats.hits++;
    this.updateHitRate();

    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    const existing = this.cache.get(key);
    let hits = 0;

    if (existing) {
      // If it exists but is expired, treat it as new
      if (Date.now() > existing.expiresAt) {
        this.cache.delete(key);
      } else {
        // Otherwise, we'll replace it and keep the hit count
        this.cache.delete(key);
        hits = existing.hits;
      }
    }

    // Only evict if we're adding a truly new key and at capacity
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evict();
    }

    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);

    this.cache.set(key, {
      key,
      value,
      expiresAt,
      hits,
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

    // Maintain LRU order even for has() checks
    this.cache.delete(key);
    entry.lastAccess = Date.now();
    entry.hits++;
    this.cache.set(key, entry);

    return true;
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  private evict(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
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
    const result: string[] = [];
    for (const [key, entry] of this.cache) {
      if (now <= entry.expiresAt) {
        result.push(key);
      }
    }
    return result;
  }

  values(): T[] {
    const now = Date.now();
    const result: T[] = [];
    for (const entry of this.cache.values()) {
      if (now <= entry.expiresAt) {
        result.push(entry.value);
      }
    }
    return result;
  }

  entries(): Array<[string, T]> {
    const now = Date.now();
    const result: Array<[string, T]> = [];
    for (const [key, entry] of this.cache) {
      if (now <= entry.expiresAt) {
        result.push([key, entry.value]);
      }
    }
    return result;
  }
}
