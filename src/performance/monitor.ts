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

    // O(1) amortized sliding window cleanup of expired head metrics instead of O(N) array allocation/filtering
    const cutoff = Date.now() - this.config.retentionPeriod;
    if (values.length > 0 && values[0].timestamp.getTime() < cutoff) {
      let firstValid = 0;
      while (firstValid < values.length && values[firstValid].timestamp.getTime() < cutoff) {
        firstValid++;
      }
      values.splice(0, firstValid);
    }
  }

  getMetric(name: string, duration?: number): MetricValue[] {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return [];
    if (!duration) return values;

    const cutoff = Date.now() - duration;
    // Single-pass indexed loop to collect matching metrics
    const result: MetricValue[] = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i].timestamp.getTime() >= cutoff) {
        result.push(values[i]);
      }
    }
    return result;
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
    const values = this.metrics.get(name);
    if (!values || values.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const count = values.length;
    // Single-pass scan to copy values into Float64Array while computing min, max, sum
    const typedVals = new Float64Array(count);
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < count; i++) {
      const v = values[i].value;
      typedVals[i] = v;
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }

    // Fast native typed array sorting for percentile calculation
    typedVals.sort();

    const percentile = (p: number): number => {
      const index = Math.ceil(count * p) - 1;
      return typedVals[Math.max(0, index)];
    };

    return {
      count,
      min,
      max,
      avg: sum / count,
      p50: percentile(0.5),
      p95: percentile(0.95),
      p99: percentile(0.99),
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
      this.alerts.splice(0, this.alerts.length - 1000);
    }
  }

  getAlerts(filters?: {
    severity?: Alert['severity'];
    startDate?: Date;
    endDate?: Date;
  }): Alert[] {
    if (!filters || (!filters.severity && !filters.startDate && !filters.endDate)) {
      return [...this.alerts];
    }

    const result: Alert[] = [];
    const { severity, startDate, endDate } = filters;
    const startMs = startDate ? startDate.getTime() : -Infinity;
    const endMs = endDate ? endDate.getTime() : Infinity;

    for (let i = 0; i < this.alerts.length; i++) {
      const a = this.alerts[i];
      if (severity && a.severity !== severity) continue;
      const ts = a.timestamp.getTime();
      if (ts < startMs || ts > endMs) continue;
      result.push(a);
    }

    return result;
  }

  getAlertStats(): {
    total: number;
    warnings: number;
    critical: number;
    resolved: number;
  } {
    let warnings = 0;
    let critical = 0;
    const total = this.alerts.length;

    for (let i = 0; i < total; i++) {
      if (this.alerts[i].severity === 'warning') {
        warnings++;
      } else if (this.alerts[i].severity === 'critical') {
        critical++;
      }
    }

    return {
      total,
      warnings,
      critical,
      resolved: 0,
    };
  }

  clearOldMetrics(): void {
    const cutoff = Date.now() - this.config.retentionPeriod;
    for (const [name, values] of this.metrics.entries()) {
      if (values.length > 0 && values[0].timestamp.getTime() < cutoff) {
        let firstValid = 0;
        while (firstValid < values.length && values[firstValid].timestamp.getTime() < cutoff) {
          firstValid++;
        }
        if (firstValid === values.length) {
          this.metrics.delete(name);
        } else {
          values.splice(0, firstValid);
        }
      }
    }
  }
}
