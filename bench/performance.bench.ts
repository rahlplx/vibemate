// Benchmark suite for LRUCache and PerformanceMonitor
import { LRUCache } from '../src/performance/cache';
import { PerformanceMonitor } from '../src/performance/monitor';

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function runCacheBenchmark() {
  console.log('\n--- LRUCache Benchmark ---');
  const size = 1000;
  const cache = new LRUCache<number>({ maxSize: size, defaultTTL: 10000 });

  // 1. SET Benchmark (at capacity, triggering eviction)
  // Fill the cache first
  for (let i = 0; i < size; i++) {
    cache.set(`key-${i}`, i);
  }

  let start = performance.now();
  const iterations = 50000;
  for (let i = 0; i < iterations; i++) {
    cache.set(`new-key-${i}`, i);
  }
  let duration = performance.now() - start;
  console.log(`SET (with eviction): ${formatNumber(iterations / (duration / 1000))} ops/sec (${duration.toFixed(2)}ms total)`);

  // Reset and fill cache
  cache.clear();
  for (let i = 0; i < size; i++) {
    cache.set(`key-${i}`, i);
  }

  // 2. GET Benchmark
  start = performance.now();
  for (let i = 0; i < iterations; i++) {
    cache.get(`key-${i % size}`);
  }
  duration = performance.now() - start;
  console.log(`GET (hits/misses): ${formatNumber(iterations / (duration / 1000))} ops/sec (${duration.toFixed(2)}ms total)`);

  // 3. Collection Methods Benchmark
  start = performance.now();
  const collIterations = 1000;
  for (let i = 0; i < collIterations; i++) {
    cache.keys();
  }
  let keysDuration = performance.now() - start;
  console.log(`keys(): ${formatNumber(collIterations / (keysDuration / 1000))} ops/sec (${keysDuration.toFixed(2)}ms total)`);

  start = performance.now();
  for (let i = 0; i < collIterations; i++) {
    cache.values();
  }
  let valuesDuration = performance.now() - start;
  console.log(`values(): ${formatNumber(collIterations / (valuesDuration / 1000))} ops/sec (${valuesDuration.toFixed(2)}ms total)`);

  start = performance.now();
  for (let i = 0; i < collIterations; i++) {
    cache.entries();
  }
  let entriesDuration = performance.now() - start;
  console.log(`entries(): ${formatNumber(collIterations / (entriesDuration / 1000))} ops/sec (${entriesDuration.toFixed(2)}ms total)`);
}

function runMonitorBenchmark() {
  console.log('\n--- PerformanceMonitor Benchmark ---');
  const monitor = new PerformanceMonitor({
    retentionPeriod: 60000, // 1 minute retention
  });

  // 1. recordMetric Benchmark (sequential insertions with cleanup)
  const metricCount = 10000;
  let start = performance.now();
  for (let i = 0; i < metricCount; i++) {
    monitor.recordMetric('http.request.duration', Math.random() * 200);
  }
  let duration = performance.now() - start;
  console.log(`recordMetric (10,000 insertions): ${formatNumber(metricCount / (duration / 1000))} ops/sec (${duration.toFixed(2)}ms total)`);

  // 2. getMetric Benchmark (O(N) vs O(log N) query)
  start = performance.now();
  const queryIterations = 1000;
  // We query for the last 30 seconds of metrics
  for (let i = 0; i < queryIterations; i++) {
    monitor.getMetric('http.request.duration', 30000);
  }
  duration = performance.now() - start;
  console.log(`getMetric (1,000 queries over 10k data points): ${formatNumber(queryIterations / (duration / 1000))} ops/sec (${duration.toFixed(2)}ms total)`);
}

console.log('Running Performance Benchmarks...');
runCacheBenchmark();
runMonitorBenchmark();
