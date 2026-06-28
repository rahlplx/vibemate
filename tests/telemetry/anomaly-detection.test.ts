import { describe, it, expect, beforeEach } from 'bun:test';
import { TelemetryCollector } from '../../src/telemetry/collector.js';

function makeCollector(anomalyThreshold = 3) {
  return new TelemetryCollector({
    enabled: true,
    exportDir: '/tmp/test-telemetry-anomaly',
    serviceName: 'test',
    serviceVersion: '0.0.1',
    anomalyThreshold,
  });
}

describe('Anomaly Detection — Welford Baseline + Z-score', () => {
  let collector: TelemetryCollector;

  beforeEach(() => {
    collector = makeCollector();
  });

  it('flags latency spike > 3σ from baseline as anomaly', () => {
    // Establish baseline: 10 spans averaging ~100ms
    for (let i = 0; i < 10; i++) {
      const span = collector.startSpan('agent.turn');
      const spanObj = collector.getSpan(span.spanId);
      if (spanObj) spanObj.startTime = Date.now() - 100;
      collector.endSpan(span.spanId, 'ok');
    }

    // Now add a spike at 800ms
    const spikeSpan = collector.startSpan('agent.turn');
    const spikeObj = collector.getSpan(spikeSpan.spanId);
    if (spikeObj) spikeObj.startTime = Date.now() - 800;
    collector.endSpan(spikeSpan.spanId, 'ok');

    const anomalies = collector.getAnomalies();
    expect(anomalies.length).toBeGreaterThan(0);
    const spike = anomalies.find(a => a.spanId === spikeSpan.spanId);
    expect(spike).toBeDefined();
    expect(spike?.type).toBe('latency_spike');
    expect(spike?.zScore).toBeGreaterThan(3);
  });

  it('flags error surge when recent error rate exceeds 2x baseline', () => {
    // Establish baseline: 20 spans with ~5% error rate (1 error)
    for (let i = 0; i < 19; i++) {
      const span = collector.startSpan('tool.call');
      collector.endSpan(span.spanId, 'ok');
    }
    const errSpan = collector.startSpan('tool.call');
    collector.endSpan(errSpan.spanId, 'error');

    // Now add 10 spans with 40% error rate (4 errors)
    for (let i = 0; i < 6; i++) {
      const span = collector.startSpan('tool.call');
      collector.endSpan(span.spanId, 'ok');
    }
    for (let i = 0; i < 4; i++) {
      const span = collector.startSpan('tool.call');
      collector.endSpan(span.spanId, 'error');
    }

    const anomalies = collector.getAnomalies();
    const surgeFlagged = anomalies.some(a => a.type === 'error_surge');
    expect(surgeFlagged).toBe(true);
  });

  it('getAnomalies() returns AnomalyEvent array with correct shape', () => {
    // Create a spike
    for (let i = 0; i < 10; i++) {
      const span = collector.startSpan('agent.turn');
      const spanObj = collector.getSpan(span.spanId);
      if (spanObj) spanObj.startTime = Date.now() - 100;
      collector.endSpan(span.spanId, 'ok');
    }
    const spikeSpan = collector.startSpan('agent.turn');
    const spikeObj = collector.getSpan(spikeSpan.spanId);
    if (spikeObj) spikeObj.startTime = Date.now() - 900;
    collector.endSpan(spikeSpan.spanId, 'ok');

    const anomalies = collector.getAnomalies();
    expect(Array.isArray(anomalies)).toBe(true);

    if (anomalies.length > 0) {
      const a = anomalies[0];
      expect(a).toHaveProperty('spanId');
      expect(a).toHaveProperty('spanName');
      expect(a).toHaveProperty('type');
      expect(a).toHaveProperty('zScore');
      expect(a).toHaveProperty('severity');
      expect(a).toHaveProperty('detectedAt');
      expect(['latency_spike', 'error_surge', 'throughput_drop']).toContain(a.type);
      expect(['warning', 'critical']).toContain(a.severity);
    }
  });

  it('returns no anomalies with uniform data', () => {
    for (let i = 0; i < 20; i++) {
      const span = collector.startSpan('agent.turn');
      const spanObj = collector.getSpan(span.spanId);
      if (spanObj) spanObj.startTime = Date.now() - 100;
      collector.endSpan(span.spanId, 'ok');
    }

    const anomalies = collector.getAnomalies();
    const latencySpikes = anomalies.filter(a => a.type === 'latency_spike');
    expect(latencySpikes.length).toBe(0);
  });

  it('baseline resets after export() — stale history does not carry over', async () => {
    // Create spike baseline, export, then add uniform spans
    for (let i = 0; i < 10; i++) {
      const span = collector.startSpan('agent.turn');
      const spanObj = collector.getSpan(span.spanId);
      if (spanObj) spanObj.startTime = Date.now() - (i < 9 ? 100 : 5000);
      collector.endSpan(span.spanId, 'ok');
    }

    await collector.export();

    // After export, add uniform spans — no baseline to compare against
    for (let i = 0; i < 5; i++) {
      const span = collector.startSpan('agent.turn');
      const spanObj = collector.getSpan(span.spanId);
      if (spanObj) spanObj.startTime = Date.now() - 100;
      collector.endSpan(span.spanId, 'ok');
    }

    // With only 5 spans post-export, no baseline established yet — no anomalies
    const anomalies = collector.getAnomalies();
    const latencySpikes = anomalies.filter(a => a.type === 'latency_spike');
    expect(latencySpikes.length).toBe(0);
  });
});
