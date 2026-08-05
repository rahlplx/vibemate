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

  it('should handle binary search edge cases in getMetric', () => {
    // 1. Empty metrics
    expect(monitor.getMetric('nonexistent', 1000)).toHaveLength(0);

    // 2. All metrics are older than duration (should return empty)
    monitor.recordMetric('disk', 10);
    // Manually backdate the recorded metric timestamp
    const diskMetrics = monitor.getMetric('disk');
    diskMetrics[0].timestamp = new Date(Date.now() - 5000);

    // Query last 1000ms: the backdated metric should be filtered out
    expect(monitor.getMetric('disk', 1000)).toHaveLength(0);

    // 3. All metrics are newer than duration (should return all)
    monitor.recordMetric('network', 100);
    expect(monitor.getMetric('network', 10000)).toHaveLength(1);

    // 4. Exact mix of newer and older metrics
    monitor.recordMetric('mixed', 1); // mixed[0]
    monitor.recordMetric('mixed', 2); // mixed[1]
    monitor.recordMetric('mixed', 3); // mixed[2]
    const mixedMetrics = monitor.getMetric('mixed');
    mixedMetrics[0].timestamp = new Date(Date.now() - 10000); // 10s old
    mixedMetrics[1].timestamp = new Date(Date.now() - 5000);  // 5s old
    mixedMetrics[2].timestamp = new Date(Date.now() - 1000);  // 1s old

    // Query last 6000ms: should find the last 2 metrics (index 1 and index 2)
    const result = monitor.getMetric('mixed', 6000);
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(2);
    expect(result[1].value).toBe(3);
  });

  it('should correctly prune expired metrics in recordMetric and clearOldMetrics', () => {
    const shortMonitor = new PerformanceMonitor({
      retentionPeriod: 50, // 50ms retention
    });

    shortMonitor.recordMetric('cpu', 10);
    shortMonitor.recordMetric('cpu', 20);

    const metrics1 = shortMonitor.getMetric('cpu');
    expect(metrics1).toHaveLength(2);

    // Backdate the first metric to be expired
    metrics1[0].timestamp = new Date(Date.now() - 100);

    // Recording a new metric should prune the backdated metric
    shortMonitor.recordMetric('cpu', 30);
    const metrics2 = shortMonitor.getMetric('cpu');
    expect(metrics2).toHaveLength(2);
    expect(metrics2[0].value).toBe(20);
    expect(metrics2[1].value).toBe(30);

    // Backdate another metric to be expired
    metrics2[0].timestamp = new Date(Date.now() - 100);
    // Calling clearOldMetrics should prune it
    shortMonitor.clearOldMetrics();
    const metrics3 = shortMonitor.getMetric('cpu');
    expect(metrics3).toHaveLength(1);
    expect(metrics3[0].value).toBe(30);
  });
});
