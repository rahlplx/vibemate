import { LRUCache } from '../src/performance/cache';

function runBenchmark() {
  console.log('==================================================');
  console.log('LRUCache Benchmark');
  console.log('==================================================');

  // Create a cache with 100,000 entries
  const cacheSize = 100000;
  const cache = new LRUCache<string>({ maxSize: cacheSize, defaultTTL: 1000000 });

  console.log(`Filling cache with ${cacheSize} items...`);
  const fillStart = performance.now();
  for (let i = 0; i < cacheSize; i++) {
    cache.set(`key-${i}`, `value-${i}`);
  }
  const fillEnd = performance.now();
  console.log(`Filled in ${(fillEnd - fillStart).toFixed(2)}ms`);

  console.log('\nRunning GET operations...');
  const getStart = performance.now();
  for (let i = 0; i < cacheSize; i++) {
    cache.get(`key-${i}`);
  }
  const getEnd = performance.now();
  console.log(`Completed GETs in ${(getEnd - getStart).toFixed(2)}ms`);

  console.log('\nRetrieving keys (keys())...');
  const keysStart = performance.now();
  const keys = cache.keys();
  const keysEnd = performance.now();
  console.log(`keys() took ${(keysEnd - keysStart).toFixed(2)}ms (found ${keys.length} keys)`);

  console.log('\nRetrieving values (values())...');
  const valuesStart = performance.now();
  const values = cache.values();
  const valuesEnd = performance.now();
  console.log(`values() took ${(valuesEnd - valuesStart).toFixed(2)}ms (found ${values.length} values)`);

  console.log('\nRetrieving entries (entries())...');
  const entriesStart = performance.now();
  const entries = cache.entries();
  const entriesEnd = performance.now();
  console.log(`entries() took ${(entriesEnd - entriesStart).toFixed(2)}ms (found ${entries.length} entries)`);

  console.log('==================================================');
}

runBenchmark();
