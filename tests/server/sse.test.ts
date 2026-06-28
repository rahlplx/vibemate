import { describe, it, expect } from 'bun:test';
import { TelemetryCollector } from '../../src/telemetry/collector.js';
import { app } from '../../src/server/api.js';
import type { TelemetrySpan } from '../../src/types.js';

// -------------------------------------------------------------------
// M4-A: TelemetryCollector subscriber mechanism
// -------------------------------------------------------------------
describe('TelemetryCollector.subscribe()', () => {
  it('subscriber receives span when startSpan() is called', () => {
    const tc = new TelemetryCollector({ enabled: true, serviceName: 'test', serviceVersion: '1' });
    const received: TelemetrySpan[] = [];
    tc.subscribe(s => received.push(s));

    tc.startSpan('test.span');

    expect(received).toHaveLength(1);
    expect(received[0].name).toBe('test.span');
  });

  it('unsubscribe function stops further notifications', () => {
    const tc = new TelemetryCollector({ enabled: true, serviceName: 'test', serviceVersion: '1' });
    const received: TelemetrySpan[] = [];
    const unsub = tc.subscribe(s => received.push(s));

    tc.startSpan('span-1');
    unsub();
    tc.startSpan('span-2');

    expect(received).toHaveLength(1);
    expect(received[0].name).toBe('span-1');
  });

  it('multiple subscribers each receive the same span', () => {
    const tc = new TelemetryCollector({ enabled: true, serviceName: 'test', serviceVersion: '1' });
    const a: string[] = [];
    const b: string[] = [];
    tc.subscribe(s => a.push(s.name));
    tc.subscribe(s => b.push(s.name));

    tc.startSpan('multi-span');

    expect(a).toEqual(['multi-span']);
    expect(b).toEqual(['multi-span']);
  });

  it('subscriber with no spans emits nothing', () => {
    const tc = new TelemetryCollector({ enabled: true, serviceName: 'test', serviceVersion: '1' });
    const received: TelemetrySpan[] = [];
    tc.subscribe(s => received.push(s));
    // No spans added
    expect(received).toHaveLength(0);
  });

  it('unsubscribing one does not affect others', () => {
    const tc = new TelemetryCollector({ enabled: true, serviceName: 'test', serviceVersion: '1' });
    const a: string[] = [];
    const b: string[] = [];
    const unsubA = tc.subscribe(s => a.push(s.name));
    tc.subscribe(s => b.push(s.name));

    tc.startSpan('before');
    unsubA();
    tc.startSpan('after');

    expect(a).toEqual(['before']);
    expect(b).toEqual(['before', 'after']);
  });

  it('subscriber receives span attributes', () => {
    const tc = new TelemetryCollector({ enabled: true, serviceName: 'test', serviceVersion: '1' });
    const spans: TelemetrySpan[] = [];
    tc.subscribe(s => spans.push(s));

    tc.startSpan('attr.span', undefined, { 'custom.key': 'custom-value' });

    expect(spans[0].attributes['custom.key']).toBe('custom-value');
  });
});

// -------------------------------------------------------------------
// M4-B: SSE endpoint
// -------------------------------------------------------------------
describe('GET /events SSE endpoint', () => {
  it('returns Content-Type text/event-stream', async () => {
    const res = await app.request('/events');
    expect(res.headers.get('content-type')).toContain('text/event-stream');
  });

  it('returns 200 status', async () => {
    const res = await app.request('/events');
    expect(res.status).toBe(200);
  });

  it('sets Cache-Control no-cache', async () => {
    const res = await app.request('/events');
    expect(res.headers.get('cache-control')).toContain('no-cache');
  });
});

// -------------------------------------------------------------------
// M4-C: Vibemate Doctor endpoint
// -------------------------------------------------------------------
describe('GET /api/doctor', () => {
  it('returns 200', async () => {
    const res = await app.request('/api/doctor');
    expect(res.status).toBe(200);
  });

  it('returns status field (healthy or degraded)', async () => {
    const res = await app.request('/api/doctor');
    const body = await res.json() as { status: string; checks: unknown[] };
    expect(['healthy', 'degraded']).toContain(body.status);
  });

  it('returns checks array', async () => {
    const res = await app.request('/api/doctor');
    const body = await res.json() as { status: string; checks: { name: string; ok: boolean; detail: string }[] };
    expect(Array.isArray(body.checks)).toBe(true);
    expect(body.checks.length).toBeGreaterThan(0);
  });

  it('each check has name, ok, and detail', async () => {
    const res = await app.request('/api/doctor');
    const body = await res.json() as { checks: { name: string; ok: boolean; detail: string }[] };
    for (const check of body.checks) {
      expect(typeof check.name).toBe('string');
      expect(typeof check.ok).toBe('boolean');
      expect(typeof check.detail).toBe('string');
    }
  });

  it('includes a database check', async () => {
    const res = await app.request('/api/doctor');
    const body = await res.json() as { checks: { name: string; ok: boolean }[] };
    expect(body.checks.some(c => c.name === 'database')).toBe(true);
  });

  it('includes a telemetry check', async () => {
    const res = await app.request('/api/doctor');
    const body = await res.json() as { checks: { name: string }[] };
    expect(body.checks.some(c => c.name === 'telemetry')).toBe(true);
  });

  it('includes a pipeline check', async () => {
    const res = await app.request('/api/doctor');
    const body = await res.json() as { checks: { name: string }[] };
    expect(body.checks.some(c => c.name === 'pipeline')).toBe(true);
  });

  it('status is healthy when all checks pass', async () => {
    const res = await app.request('/api/doctor');
    const body = await res.json() as { status: string; checks: { ok: boolean }[] };
    const allOk = body.checks.every(c => c.ok);
    if (allOk) {
      expect(body.status).toBe('healthy');
    } else {
      expect(body.status).toBe('degraded');
    }
  });
});
