import { PerformanceMonitor } from './src/performance/monitor';

async function runBench() {
    const count = 20000;
    const monitor = new PerformanceMonitor({
        retentionPeriod: 1000 * 60 * 60, // 1 hour
    });

    console.log(`Running benchmark with ${count} metrics (sequential timestamps)...`);
    const start = performance.now();
    for (let i = 0; i < count; i++) {
        // Use the default Date.now() which is approximately sequential
        monitor.recordMetric('test', i);
        if (i % 5000 === 0) {
            console.log(`  Processed ${i} metrics...`);
        }
    }
    const end = performance.now();
    console.log(`Total time: ${(end - start).toFixed(2)}ms`);
    console.log(`Average time per recordMetric: ${((end - start) / count).toFixed(4)}ms`);
}

runBench();
