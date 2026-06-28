import { describe, it, expect, beforeEach } from 'bun:test';
import { TelemetryCollector } from '../../src/telemetry/collector.js';

describe('Span Retention — Bounded Storage', () => {
  let collector: TelemetryCollector;

  beforeEach(() => {
    collector = new TelemetryCollector({
      enabled: true,
      exportDir: '/tmp/test-telemetry',
      serviceName: 'test',
      serviceVersion: '0.0.1',
      maxSpanCount: 1000,
      evictionStrategy: 'priority',
    });
  });

  it('evicts oldest span when 1001st span is inserted (LRU)', () => {
    const firstSpan = collector.startSpan('first.span');
    for (let i = 0; i < 1000; i++) {
      collector.startSpan(`span.${i}`);
    }
    const stats = collector.getRetentionStats();
    expect(stats.currentCount).toBe(1000);
    const retained = collector.getSpan(firstSpan.spanId);
    expect(retained).toBeUndefined();
  });

  it('spans.length never exceeds maxSpanCount after many insertions', () => {
    for (let i = 0; i < 1500; i++) {
      collector.startSpan(`span.${i}`);
    }
    const stats = collector.getRetentionStats();
    expect(stats.currentCount).toBeLessThanOrEqual(1000);
  });

  it('traces Map is pruned when all spans of a trace are evicted', () => {
    // Fill up to max with a distinct trace
    const firstSpan = collector.startSpan('trace.root');
    const traceId = firstSpan.traceId;

    for (let i = 0; i < 1000; i++) {
      collector.startSpan(`span.${i}`);
    }

    // The original trace should have been pruned
    const stats = collector.getRetentionStats();
    expect(stats.currentCount).toBe(1000);
    // traceId should no longer exist in traces map (all spans of that trace evicted)
    collector.getTrace(traceId).then(spans => {
      expect(spans.length).toBe(0);
    });
  });

  it('tracks total evicted count across evictions', () => {
    for (let i = 0; i < 1500; i++) {
      collector.startSpan(`span.${i}`);
    }
    const stats = collector.getRetentionStats();
    expect(stats.totalEvicted).toBeGreaterThan(0);
    expect(stats.totalEvicted).toBe(500);
  });

  it('retains error spans preferentially over ok spans in priority eviction', () => {
    // Fill with ok spans first
    for (let i = 0; i < 500; i++) {
      const s = collector.startSpan(`ok.span.${i}`);
      collector.endSpan(s.spanId, 'ok');
    }
    // Add error spans
    const errorSpanIds: string[] = [];
    for (let i = 0; i < 500; i++) {
      const s = collector.startSpan(`error.span.${i}`);
      collector.endSpan(s.spanId, 'error');
      errorSpanIds.push(s.spanId);
    }
    // Push over limit — should evict ok spans first
    for (let i = 0; i < 100; i++) {
      collector.startSpan(`new.ok.span.${i}`);
    }
    // All error spans should still be retained
    for (const id of errorSpanIds) {
      const span = collector.getSpan(id);
      expect(span).toBeDefined();
    }
  });
});
