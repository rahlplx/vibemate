import { LRUCache } from '../src/performance/cache';

const ITERATIONS = 100_000;
const CACHE_SIZE = 1000;

function benchLRU() {
  const cache = new LRUCache<number>({ maxSize: CACHE_SIZE });

  console.log(`Running LRU Benchmark with ${ITERATIONS} iterations...`);

  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    const key = `key-${i % (CACHE_SIZE * 2)}`;
    cache.set(key, i);
    cache.get(`key-${Math.floor(Math.random() * CACHE_SIZE * 2)}`);
  }
  const end = performance.now();

  console.log(`Time taken: ${(end - start).toFixed(2)}ms`);
  console.log(`Avg time per op: ${((end - start) / ITERATIONS * 1000).toFixed(4)}us`);
}

function benchCollections() {
  const cache = new LRUCache<number>({ maxSize: CACHE_SIZE });
  for (let i = 0; i < CACHE_SIZE; i++) {
    cache.set(`key-${i}`, i);
  }

  console.log(`Running Collections Benchmark (keys/values/entries)...`);
  const start = performance.now();
  for (let i = 0; i < 1000; i++) {
    cache.keys();
    cache.values();
    cache.entries();
  }
  const end = performance.now();
  console.log(`Time taken for 1000 collection calls: ${(end - start).toFixed(2)}ms`);
}

benchLRU();
benchCollections();
