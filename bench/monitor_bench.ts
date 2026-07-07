import { PerformanceMonitor } from '../src/performance/monitor';

const ITERATIONS = 20000;
const METRIC_NAME = 'test_metric';

function benchMonitor() {
  const monitor = new PerformanceMonitor({
    retentionPeriod: 10000 // 10 seconds
  });

  console.log(`Running PerformanceMonitor benchmark with ${ITERATIONS} recordings...`);

  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    monitor.recordMetric(METRIC_NAME, Math.random());
  }
  const end = performance.now();

  console.log(`recordMetric x ${ITERATIONS}: ${(end - start).toFixed(2)}ms`);

  const statsStart = performance.now();
  monitor.getMetricStats(METRIC_NAME);
  const statsEnd = performance.now();
  console.log(`getMetricStats: ${(statsEnd - statsStart).toFixed(2)}ms`);
}

benchMonitor();
