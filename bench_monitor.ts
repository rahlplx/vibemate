import { PerformanceMonitor } from './src/performance/monitor';

const count = 50000;

function bench(retention: number) {
    const monitor = new PerformanceMonitor({
        retentionPeriod: retention,
    });
    const start = performance.now();
    for (let i = 0; i < count; i++) {
        monitor.recordMetric('test', i);
    }
    const end = performance.now();
    return end - start;
}

const time1 = bench(100000);
console.log(`Large retention (no pruning during loop): ${time1.toFixed(2)}ms`);

const time2 = bench(0); // Everything expires immediately
console.log(`Zero retention (pruning every record): ${time2.toFixed(2)}ms`);
