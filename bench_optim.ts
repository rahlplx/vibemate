
export interface MetricValue {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface PerformanceConfig {
  metricsInterval: number;
  alertCooldown: number;
  retentionPeriod: number;
}

export class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: Map<string, MetricValue[]> = new Map();

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      metricsInterval: 10000,
      alertCooldown: 60000,
      retentionPeriod: 86400000, // 24 hours
      ...config,
    };
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricValue = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(metric);

    // Cleanup old metrics - ORIGINAL O(N)
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.metrics.set(
      name,
      values.filter(m => m.timestamp.getTime() >= cutoff)
    );
  }

  recordMetricOptimized(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricValue = {
      name,
      value,
      timestamp: new Date(),
      tags,
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(metric);

    // Cleanup old metrics - OPTIMIZED O(1) amortized
    const cutoff = Date.now() - this.config.retentionPeriod;
    while (values.length > 0 && values[0].timestamp.getTime() < cutoff) {
      values.shift();
    }
  }
}

const count = 20000;
const monitor = new PerformanceMonitor({ retentionPeriod: 1000 * 60 * 60 });

console.log('Benchmarking recordMetric (O(N) pruning)...');
const start1 = performance.now();
for (let i = 0; i < count; i++) {
    monitor.recordMetric('test', i);
}
const end1 = performance.now();
console.log(`Original: ${(end1 - start1).toFixed(2)}ms`);

const monitor2 = new PerformanceMonitor({ retentionPeriod: 1000 * 60 * 60 });
console.log('Benchmarking recordMetricOptimized (O(1) head pruning)...');
const start2 = performance.now();
for (let i = 0; i < count; i++) {
    monitor2.recordMetricOptimized('test', i);
}
const end2 = performance.now();
console.log(`Optimized: ${(end2 - start2).toFixed(2)}ms`);
console.log(`Speedup: ${((end1 - start1) / (end2 - start2)).toFixed(2)}x`);
