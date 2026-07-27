import { LRUCache } from '../src/performance/cache';

function runBench() {
  const cache = new LRUCache<string>({ maxSize: 10000, defaultTTL: 10000 });
  const keys: string[] = [];
  for (let i = 0; i < 15000; i++) {
    keys.push(`key_${i}`);
  }

  // 1. Benchmark set
  let start = performance.now();
  for (let i = 0; i < 15000; i++) {
    cache.set(keys[i], `val_${i}`);
  }
  const setTime = performance.now() - start;

  // 2. Benchmark get
  start = performance.now();
  for (let i = 0; i < 15000; i++) {
    cache.get(keys[i]);
  }
  const getTime = performance.now() - start;

  // 3. Benchmark keys/values/entries conversion
  start = performance.now();
  for (let i = 0; i < 100; i++) {
    cache.keys();
    cache.values();
    cache.entries();
  }
  const collectionTime = performance.now() - start;

  console.log(`Set 15k items: ${setTime.toFixed(2)} ms`);
  console.log(`Get 15k items: ${getTime.toFixed(2)} ms`);
  console.log(`100x keys/values/entries: ${collectionTime.toFixed(2)} ms`);
}

runBench();
