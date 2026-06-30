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

  it('evicts oldest span when limit is reached (LRU)', () => {
    // We use a small limit for testing batching
    const smallCollector = new TelemetryCollector({
      enabled: true,
      exportDir: '/tmp/test-telemetry',
      serviceName: 'test',
      serviceVersion: '0.0.1',
      maxSpanCount: 10,
      evictionStrategy: 'lru',
    });

    const firstSpan = smallCollector.startSpan('first.span');
    // maxSpanCount is 10, threshold is 11.
    // 1 (first) + 10 = 11. 12th should trigger eviction of 2 spans.
    for (let i = 0; i < 11; i++) {
      smallCollector.startSpan(`span.${i}`);
    }
    const stats = smallCollector.getRetentionStats();
    // After 12 insertions, it should have evicted 12 - 10 = 2 spans.
    expect(stats.currentCount).toBe(10);
    expect(stats.totalEvicted).toBe(2);
    const retained = smallCollector.getSpan(firstSpan.spanId);
    expect(retained).toBeUndefined();
  });

  it('spans.length remains bounded with batching', () => {
    for (let i = 0; i < 1500; i++) {
      collector.startSpan(`span.${i}`);
    }
    const stats = collector.getRetentionStats();
    // maxSpanCount 1000, threshold 1100.
    expect(stats.currentCount).toBeLessThanOrEqual(1100);
    expect(stats.currentCount).toBeGreaterThanOrEqual(1000);
  });

  it('traces Map is pruned when all spans of a trace are evicted', async () => {
    const smallCollector = new TelemetryCollector({
      enabled: true,
      exportDir: '/tmp/test-telemetry',
      serviceName: 'test',
      serviceVersion: '0.0.1',
      maxSpanCount: 10,
    });

    // Fill up to max with a distinct trace
    const firstSpan = smallCollector.startSpan('trace.root');
    const traceId = firstSpan.traceId;

    for (let i = 0; i < 11; i++) {
      smallCollector.startSpan(`span.${i}`);
    }

    // The original trace should have been pruned
    const stats = smallCollector.getRetentionStats();
    expect(stats.currentCount).toBe(10);

    const spans = await smallCollector.getTrace(traceId);
    expect(spans.length).toBe(0);
  });

  it('tracks total evicted count across evictions', () => {
    // maxSpanCount 1000, threshold 1100.
    // 1101st span triggers eviction of 101 spans.
    // 1202nd span triggers eviction of another 101 spans.
    // ...
    for (let i = 0; i < 1300; i++) {
      collector.startSpan(`span.${i}`);
    }
    const stats = collector.getRetentionStats();
    expect(stats.totalEvicted).toBeGreaterThan(0);
    // 1300 total.
    // At 1101: evict 101 -> 1000 left, totalEvicted 101.
    // At 1101 + 101 = 1202: evict 101 -> 1000 left, totalEvicted 202.
    // Final count: 1300 - 202 = 1098.
    expect(stats.totalEvicted).toBe(202);
    expect(stats.currentCount).toBe(1098);
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
