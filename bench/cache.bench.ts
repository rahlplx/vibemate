import { LRUCache } from '../src/performance/cache';

function runBenchmark() {
  const cache = new LRUCache<string>({ maxSize: 10000, defaultTTL: 100000 });

  // 1. Warm up & Set entries
  console.log('Writing 10,000 entries...');
  const setStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    cache.set(`key-${i}`, `val-${i}`);
  }
  const setEnd = performance.now();
  console.log(`Set took ${(setEnd - setStart).toFixed(2)}ms`);

  // 2. Measure keys()
  console.log('Running keys() 100 times...');
  const keysStart = performance.now();
  for (let i = 0; i < 100; i++) {
    cache.keys();
  }
  const keysEnd = performance.now();
  console.log(`keys() took ${(keysEnd - keysStart).toFixed(2)}ms`);

  // 3. Measure values()
  console.log('Running values() 100 times...');
  const valuesStart = performance.now();
  for (let i = 0; i < 100; i++) {
    cache.values();
  }
  const valuesEnd = performance.now();
  console.log(`values() took ${(valuesEnd - valuesStart).toFixed(2)}ms`);

  // 4. Measure entries()
  console.log('Running entries() 100 times...');
  const entriesStart = performance.now();
  for (let i = 0; i < 100; i++) {
    cache.entries();
  }
  const entriesEnd = performance.now();
  console.log(`entries() took ${(entriesEnd - entriesStart).toFixed(2)}ms`);

  // 5. Measure get() with LRU (re-inserts)
  console.log('Running get() 10,000 times...');
  const getStart = performance.now();
  for (let i = 0; i < 10000; i++) {
    cache.get(`key-${i}`);
  }
  const getEnd = performance.now();
  console.log(`get() took ${(getEnd - getStart).toFixed(2)}ms`);
}

runBenchmark();
