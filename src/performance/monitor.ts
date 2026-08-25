// Vibemate Performance Monitoring Module
// Provides metrics collection, alerting, and optimization

import { generateDeterministicId } from '../shared/random';

export interface MetricValue {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface Alert {
  id: string;
  metric: string;
  threshold: number;
  currentValue: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
  message: string;
}

export interface PerformanceConfig {
  metricsInterval: number;
  alertCooldown: number;
  retentionPeriod: number;
}

export class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: Map<string, MetricValue[]> = new Map();
  private alerts: Alert[] = [];
  private alertCooldowns: Map<string, number> = new Map();

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

    let values = this.metrics.get(name);
    if (!values) {
      values = [];
      this.metrics.set(name, values);
    }

    values.push(metric);

    // Efficiently head-prune metrics older than retention cutoff (O(N) instead of O(N^2) allocations/filtering)
    const cutoff = Date.now() - this.config.retentionPeriod;
    let removeCount = 0;
    while (removeCount < values.length && values[removeCount].timestamp.getTime() < cutoff) {
      removeCount++;
    }
    if (removeCount > 0) {
      values.splice(0, removeCount);
    }
  }

  getMetric(name: string, duration?: number): MetricValue[] {
    const values = this.metrics.get(name) || [];
    if (!duration) return values;

    // Use binary search for O(log N) lookup since values are chronologically sorted
    const cutoff = Date.now() - duration;
    let low = 0;
    let high = values.length - 1;
    let startIndex = values.length;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (values[mid].timestamp.getTime() >= cutoff) {
        startIndex = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    return values.slice(startIndex);
  }

  getMetricStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const values = (this.metrics.get(name) || []).map(m => m.value);
    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const percentile = (arr: number[], p: number): number => {
      if (arr.length === 0) return 0;
      const index = Math.ceil(arr.length * p) - 1;
      return arr[Math.max(0, index)];
    };
    return {
      count: sorted.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sorted.reduce((a, b) => a + b, 0) / sorted.length,
      p50: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
      p99: percentile(sorted, 0.99),
    };
  }

  checkAlert(metric: string, warningThreshold: number, criticalThreshold: number): void {
    const values = this.metrics.get(metric);
    if (!values || values.length === 0) return;

    const latest = values[values.length - 1];
    const now = Date.now();

    // Check cooldown
    const lastAlert = this.alertCooldowns.get(metric) || 0;
    if (now - lastAlert < this.config.alertCooldown) return;

    if (latest.value >= criticalThreshold) {
      this.createAlert(metric, criticalThreshold, latest.value, 'critical');
      this.alertCooldowns.set(metric, now);
    } else if (latest.value >= warningThreshold) {
      this.createAlert(metric, warningThreshold, latest.value, 'warning');
      this.alertCooldowns.set(metric, now);
    }
  }

  private createAlert(
    metric: string,
    threshold: number,
    currentValue: number,
    severity: Alert['severity']
  ): void {
    const alert: Alert = {
      id: generateDeterministicId(`alert-${metric}-${Date.now()}-${Math.random().toString(36).slice(2)}`),
      metric,
      threshold,
      currentValue,
      severity,
      timestamp: new Date(),
      message: `${metric} is ${currentValue} (threshold: ${threshold})`,
    };

    this.alerts.push(alert);
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(-1000);
    }
  }

  getAlerts(filters?: {
    severity?: Alert['severity'];
    startDate?: Date;
    endDate?: Date;
  }): Alert[] {
    let alerts = [...this.alerts];

    if (filters) {
      if (filters.severity) {
        alerts = alerts.filter(a => a.severity === filters.severity);
      }
      if (filters.startDate) {
        alerts = alerts.filter(a => a.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        alerts = alerts.filter(a => a.timestamp <= filters.endDate!);
      }
    }

    return alerts;
  }

  getAlertStats(): {
    total: number;
    warnings: number;
    critical: number;
    resolved: number;
  } {
    return {
      total: this.alerts.length,
      warnings: this.alerts.filter(a => a.severity === 'warning').length,
      critical: this.alerts.filter(a => a.severity === 'critical').length,
      resolved: 0, // Would need to track resolution
    };
  }

  clearOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    for (const [name, values] of this.metrics.entries()) {
      let removeCount = 0;
      while (removeCount < values.length && values[removeCount].timestamp.getTime() < cutoff) {
        removeCount++;
      }
      if (removeCount === values.length) {
        this.metrics.delete(name);
      } else if (removeCount > 0) {
        values.splice(0, removeCount);
      }
    }
  }
}
