import { LRUCache } from '../src/performance/cache';

const cache = new LRUCache<number>({ maxSize: 10000, defaultTTL: 60000 });

// Populate
for (let i = 0; i < 5000; i++) {
  cache.set(`key-${i}`, i);
}

// Benchmark GET / SET
const startGet = performance.now();
for (let i = 0; i < 100000; i++) {
  cache.get(`key-${i % 5000}`);
}
const endGet = performance.now();
console.log(`100k GETs: ${(endGet - startGet).toFixed(2)}ms`);

// Benchmark keys()
const startKeys = performance.now();
for (let i = 0; i < 1000; i++) {
  cache.keys();
}
const endKeys = performance.now();
console.log(`1k keys(): ${(endKeys - startKeys).toFixed(2)}ms`);

// Benchmark values()
const startValues = performance.now();
for (let i = 0; i < 1000; i++) {
  cache.values();
}
const endValues = performance.now();
console.log(`1k values(): ${(endValues - startValues).toFixed(2)}ms`);

// Benchmark entries()
const startEntries = performance.now();
for (let i = 0; i < 1000; i++) {
  cache.entries();
}
const endEntries = performance.now();
console.log(`1k entries(): ${(endEntries - startEntries).toFixed(2)}ms`);
