import { describe, it, expect, beforeEach } from 'bun:test';
import { LRUCache } from '../../src/performance/cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache({
      maxSize: 5,
      defaultTTL: 1000,
      enableStats: true,
    });
  });

  it('should set and get values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('should track hits and misses', () => {
    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('missing');
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it('should calculate hit rate', () => {
    cache.set('key1', 'value1');
    cache.get('key1');
    cache.get('key1');
    cache.get('missing');
    const stats = cache.getStats();
    expect(stats.hitRate).toBeCloseTo(0.6666666666666666);
  });

  it('should evict LRU entries when full', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4');
    cache.set('key5', 'value5');
    cache.set('key6', 'value6'); // Should evict key1
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key6')).toBe('value6');
  });

  it('should delete entries', () => {
    cache.set('key1', 'value1');
    cache.delete('key1');
    expect(cache.get('key1')).toBeUndefined();
  });

  it('should check if key exists', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('missing')).toBe(false);
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.getSize()).toBe(0);
  });

  it('should return all keys', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.keys()).toContain('key1');
    expect(cache.keys()).toContain('key2');
  });

  it('should return all values', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.values()).toContain('value1');
    expect(cache.values()).toContain('value2');
  });

  it('should return entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    const entries = cache.entries();
    expect(entries).toHaveLength(2);
  });

  it('should return correct size', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.getSize()).toBe(2);
  });

  it('should expire entries after TTL', async () => {
    const shortCache = new LRUCache<string>({ maxSize: 5, defaultTTL: 10 });
    shortCache.set('key1', 'value1');
    expect(shortCache.get('key1')).toBe('value1');
    await new Promise((r) => setTimeout(r, 20));
    expect(shortCache.get('key1')).toBeUndefined();
  });

  it('should respect custom TTL per entry', async () => {
    cache.set('key1', 'value1', 10);
    cache.set('key2', 'value2', 5000);
    await new Promise((r) => setTimeout(r, 20));
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
  });

  it('should prune expired entries', async () => {
    cache.set('key1', 'value1', 10);
    cache.set('key2', 'value2', 5000);
    await new Promise((r) => setTimeout(r, 20));
    cache.prune();
    expect(cache.getSize()).toBe(1);
    expect(cache.has('key2')).toBe(true);
  });

  it('should not count expired entries in keys/values', async () => {
    const shortCache = new LRUCache<string>({ maxSize: 5, defaultTTL: 10 });
    shortCache.set('key1', 'value1');
    shortCache.set('key2', 'value2');
    await new Promise((r) => setTimeout(r, 20));
    expect(shortCache.keys()).toHaveLength(0);
    expect(shortCache.values()).toHaveLength(0);
    expect(shortCache.entries()).toHaveLength(0);
  });
});
