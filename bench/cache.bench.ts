import { LRUCache } from '../src/performance/cache';

function runBenchmark() {
  const cache = new LRUCache<string>({ maxSize: 10000, defaultTTL: 60000 });

  // 1. Warm-up and fill
  for (let i = 0; i < 10000; i++) {
    cache.set(`key-${i}`, `value-${i}`);
  }

  // 2. Measure set speed
  let start = performance.now();
  for (let i = 10000; i < 20000; i++) {
    cache.set(`key-${i}`, `value-${i}`);
  }
  let end = performance.now();
  console.log(`SET 10k items (evictions triggering): ${(end - start).toFixed(2)}ms`);

  // 3. Measure get speed
  start = performance.now();
  for (let i = 15000; i < 25000; i++) {
    cache.get(`key-${i}`);
  }
  end = performance.now();
  console.log(`GET 10k items: ${(end - start).toFixed(2)}ms`);

  // 4. Measure keys()
  start = performance.now();
  for (let i = 0; i < 100; i++) {
    cache.keys();
  }
  end = performance.now();
  console.log(`keys() 100 times: ${(end - start).toFixed(2)}ms`);

  // 5. Measure values()
  start = performance.now();
  for (let i = 0; i < 100; i++) {
    cache.values();
  }
  end = performance.now();
  console.log(`values() 100 times: ${(end - start).toFixed(2)}ms`);

  // 6. Measure entries()
  start = performance.now();
  for (let i = 0; i < 100; i++) {
    cache.entries();
  }
  end = performance.now();
  console.log(`entries() 100 times: ${(end - start).toFixed(2)}ms`);
}

runBenchmark();
