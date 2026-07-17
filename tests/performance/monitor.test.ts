import { describe, it, expect, beforeEach } from 'bun:test';
import { PerformanceMonitor } from '../../src/performance/monitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor({
      metricsInterval: 1000,
      alertCooldown: 0,
      retentionPeriod: 86400000,
    });
  });

  it('should record metrics', () => {
    monitor.recordMetric('cpu', 50);
    monitor.recordMetric('memory', 60);
    const cpuMetrics = monitor.getMetric('cpu');
    expect(cpuMetrics).toHaveLength(1);
    expect(cpuMetrics[0].value).toBe(50);
  });

  it('should get metric stats', () => {
    monitor.recordMetric('cpu', 40);
    monitor.recordMetric('cpu', 50);
    monitor.recordMetric('cpu', 60);
    const stats = monitor.getMetricStats('cpu');
    expect(stats.count).toBe(3);
    expect(stats.min).toBe(40);
    expect(stats.max).toBe(60);
    expect(stats.avg).toBe(50);
  });

  it('should filter metrics by duration', () => {
    monitor.recordMetric('cpu', 50);
    const metrics = monitor.getMetric('cpu', 1000);
    expect(metrics).toHaveLength(1);
  });

  it('should create alerts', () => {
    monitor.recordMetric('cpu', 80);
    monitor.checkAlert('cpu', 70, 90);
    const alerts = monitor.getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('warning');
  });

  it('should create critical alerts', () => {
    monitor.recordMetric('cpu', 95);
    monitor.checkAlert('cpu', 70, 90);
    const alerts = monitor.getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
  });

  it('should filter alerts by severity', () => {
    monitor.recordMetric('cpu', 80);
    monitor.checkAlert('cpu', 70, 90);
    monitor.recordMetric('memory', 95);
    monitor.checkAlert('memory', 70, 90);
    const warnings = monitor.getAlerts({ severity: 'warning' });
    const criticals = monitor.getAlerts({ severity: 'critical' });
    expect(warnings).toHaveLength(1);
    expect(criticals).toHaveLength(1);
  });

  it('should return alert stats', () => {
    monitor.recordMetric('cpu', 80);
    monitor.checkAlert('cpu', 70, 90);
    const stats = monitor.getAlertStats();
    expect(stats.total).toBe(1);
    expect(stats.warnings).toBe(1);
  });

  it('should clear old metrics', () => {
    monitor.recordMetric('cpu', 50);
    monitor.clearOldMetrics();
    const metrics = monitor.getMetric('cpu');
    expect(metrics).toHaveLength(1); // Within retention period
  });

  it('should correctly prune and filter historical metrics using binary search', () => {
    // Manually seed metrics map with backdated timestamps to test binary search logic precisely
    const name = 'memory';
    const now = Date.now();
    const metricsArray = [
      { name, value: 10, timestamp: new Date(now - 5000) }, // 5s ago
      { name, value: 20, timestamp: new Date(now - 3000) }, // 3s ago
      { name, value: 30, timestamp: new Date(now - 1000) }, // 1s ago
      { name, value: 40, timestamp: new Date(now) },        // now
    ];

    // Seed internal map of PerformanceMonitor
    (monitor as any).metrics.set(name, metricsArray);

    // Query with duration = 2000 ms (only metrics in last 2 seconds)
    const activeMetrics = monitor.getMetric(name, 2000);
    expect(activeMetrics).toHaveLength(2);
    expect(activeMetrics[0].value).toBe(30);
    expect(activeMetrics[1].value).toBe(40);

    // Test clearOldMetrics with custom retention period (e.g. 2000ms)
    (monitor as any).config.retentionPeriod = 2000;
    monitor.clearOldMetrics();

    const remainingMetrics = monitor.getMetric(name);
    expect(remainingMetrics).toHaveLength(2);
    expect(remainingMetrics[0].value).toBe(30);
    expect(remainingMetrics[1].value).toBe(40);
  });
});
