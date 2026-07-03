import { PerformanceMonitor } from '../src/performance/monitor';

const ITERATIONS = 10_000;

function benchMonitor() {
  const monitor = new PerformanceMonitor({
    retentionPeriod: 1000 // 1 second
  });

  console.log(`Running PerformanceMonitor Benchmark with ${ITERATIONS} iterations...`);

  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    monitor.recordMetric('test.metric', i);
  }
  const end = performance.now();

  console.log(`Time taken: ${(end - start).toFixed(2)}ms`);
  console.log(`Avg time per record: ${((end - start) / ITERATIONS * 1000).toFixed(4)}us`);
}

benchMonitor();
