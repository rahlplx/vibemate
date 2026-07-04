import { PerformanceMonitor } from '../src/performance/monitor';

function runBench(iterations: number, retentionMs: number) {
  const monitor = new PerformanceMonitor({
    retentionPeriod: retentionMs,
  });

  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    monitor.recordMetric('test', i);
  }
  const end = performance.now();
  return end - start;
}

const iterations = 20000;
console.log(`Running benchmark with ${iterations} iterations...`);

const timeLongRetention = runBench(iterations, 10000000);
console.log(`Long retention (no evictions): ${timeLongRetention.toFixed(2)}ms`);

const timeShortRetention = runBench(iterations, 1);
console.log(`Short retention (frequent evictions): ${timeShortRetention.toFixed(2)}ms`);
