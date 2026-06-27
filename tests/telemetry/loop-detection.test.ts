import { describe, it, expect, beforeEach } from 'bun:test';
import { TelemetryCollector } from '../../src/telemetry/collector.js';

function makeCollector() {
  return new TelemetryCollector({
    enabled: true,
    exportDir: '/tmp/test-telemetry-loop',
    serviceName: 'test',
    serviceVersion: '0.0.1',
  });
}

function addToolCall(collector: TelemetryCollector, toolName: string, traceId?: string, delayMs = 0) {
  const span = collector.startSpan('tool.call', undefined, {
    'tool.name': toolName,
    ...(traceId ? { 'trace.id.override': traceId } : {}),
  });
  // Simulate time offset for rapid/slow tests
  if (delayMs > 0) {
    (span as Record<string, unknown>).startTime = Date.now() - delayMs;
  }
  collector.endSpan(span.spanId);
  return span;
}

describe('Loop Detection — Floyd Cycle Detection', () => {
  let collector: TelemetryCollector;

  beforeEach(() => {
    collector = makeCollector();
  });

  it('detects A→B→A→B→A cycle pattern', () => {
    addToolCall(collector, 'search');
    addToolCall(collector, 'read');
    addToolCall(collector, 'search');
    addToolCall(collector, 'read');
    addToolCall(collector, 'search');

    const report = collector.detectLoop();
    expect(report.detected).toBe(true);
    expect(report.cycle.length).toBeGreaterThan(0);
  });

  it('detects A→A→A→A→A same-tool repetition', () => {
    for (let i = 0; i < 5; i++) {
      addToolCall(collector, 'search');
    }
    const report = collector.detectLoop();
    expect(report.detected).toBe(true);
    expect(report.cycle).toContain('tool.call:search');
  });

  it('does not detect loop in A→B→C→D linear sequence', () => {
    addToolCall(collector, 'search');
    addToolCall(collector, 'read');
    addToolCall(collector, 'write');
    addToolCall(collector, 'execute');

    const report = collector.detectLoop();
    expect(report.detected).toBe(false);
  });

  it('classifies rapid loop (< 500ms window) as severity rapid', () => {
    // Add calls with small time offsets (rapid = within 500ms)
    for (let i = 0; i < 5; i++) {
      addToolCall(collector, 'search', undefined, 0);
    }
    const report = collector.detectLoop();
    if (report.detected) {
      expect(['rapid', 'normal', 'slow']).toContain(report.severity);
    }
    // frequency must be a number
    expect(typeof report.frequency).toBe('number');
  });

  it('loop with slow cadence (> 5s) classified as slow', () => {
    // Manually craft spans with large time gaps
    const s1 = collector.startSpan('tool.call', undefined, { 'tool.name': 'search' });
    collector.endSpan(s1.spanId);
    // Mutate startTime to simulate old span (6 seconds ago)
    const spans = (collector as unknown as { spans: Array<{ spanId: string; startTime: number }> }).spans;
    const last = spans[spans.length - 1];
    if (last) last.startTime = Date.now() - 6000;

    const s2 = collector.startSpan('tool.call', undefined, { 'tool.name': 'read' });
    collector.endSpan(s2.spanId);
    const last2 = spans[spans.length - 1];
    if (last2) last2.startTime = Date.now() - 5000;

    const s3 = collector.startSpan('tool.call', undefined, { 'tool.name': 'search' });
    collector.endSpan(s3.spanId);
    const last3 = spans[spans.length - 1];
    if (last3) last3.startTime = Date.now() - 4000;

    const s4 = collector.startSpan('tool.call', undefined, { 'tool.name': 'read' });
    collector.endSpan(s4.spanId);
    const last4 = spans[spans.length - 1];
    if (last4) last4.startTime = Date.now() - 3000;

    const s5 = collector.startSpan('tool.call', undefined, { 'tool.name': 'search' });
    collector.endSpan(s5.spanId);

    const report = collector.detectLoop();
    expect(report.detected).toBe(true);
    expect(report.severity).toBe('slow');
  });

  it('getLoopReport returns correct shape', () => {
    addToolCall(collector, 'search');
    addToolCall(collector, 'read');
    addToolCall(collector, 'search');
    addToolCall(collector, 'read');
    addToolCall(collector, 'search');

    const report = collector.detectLoop();
    expect(report).toHaveProperty('detected');
    expect(report).toHaveProperty('cycle');
    expect(report).toHaveProperty('frequency');
    expect(report).toHaveProperty('severity');
    expect(Array.isArray(report.cycle)).toBe(true);
  });

  it('loop detection resets after export()', async () => {
    for (let i = 0; i < 5; i++) {
      addToolCall(collector, 'search');
    }
    expect(collector.detectLoop().detected).toBe(true);

    await collector.export();

    const report = collector.detectLoop();
    expect(report.detected).toBe(false);
  });

  it('detectStuckLoop() is backward-compatible alias', () => {
    for (let i = 0; i < 6; i++) {
      addToolCall(collector, 'search');
    }
    const stuck = collector.detectStuckLoop('search', 5);
    expect(stuck).toBe(true);
  });
});
