import { LRUCache } from '../src/performance/cache';

function runBenchmark() {
  const iterations = 100_000;
  console.log(`Running benchmark with ${iterations.toLocaleString()} iterations...`);

  // Benchmark Set / Get (Hit / Miss / LRU Eviction)
  const cache = new LRUCache<number>({ maxSize: 1000, defaultTTL: 10000 });

  const startSetGet = performance.now();
  for (let i = 0; i < iterations; i++) {
    cache.set(`key-${i % 1500}`, i);
    cache.get(`key-${(i + 500) % 1500}`);
  }
  const endSetGet = performance.now();
  console.log(`Set/Get operations: ${(endSetGet - startSetGet).toFixed(2)}ms`);

  // Benchmark keys/values/entries single-pass conversion
  const startConversion = performance.now();
  for (let i = 0; i < 5000; i++) {
    cache.keys();
    cache.values();
    cache.entries();
  }
  const endConversion = performance.now();
  console.log(`Collection conversion (keys/values/entries): ${(endConversion - startConversion).toFixed(2)}ms`);
}

runBenchmark();
