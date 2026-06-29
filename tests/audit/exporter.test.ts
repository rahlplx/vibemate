import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { AuditExporter, parseSince, type AuditEntry } from '../../src/audit/exporter.js';

const TMP = '/tmp/audit-test-vibemate';

// ─── parseSince ───────────────────────────────────────────────────────────────

describe('parseSince', () => {
  it('parses days', () => {
    const before = Date.now();
    const d = parseSince('7d');
    expect(before - d.getTime()).toBeGreaterThanOrEqual(7 * 864e5 - 100);
    expect(before - d.getTime()).toBeLessThanOrEqual(7 * 864e5 + 100);
  });

  it('parses hours', () => {
    const before = Date.now();
    const d = parseSince('24h');
    expect(before - d.getTime()).toBeGreaterThanOrEqual(24 * 36e5 - 100);
  });

  it('parses minutes', () => {
    const d = parseSince('30m');
    expect(Date.now() - d.getTime()).toBeGreaterThanOrEqual(30 * 6e4 - 100);
  });

  it('parses seconds', () => {
    const d = parseSince('60s');
    expect(Date.now() - d.getTime()).toBeGreaterThanOrEqual(60 * 1e3 - 100);
  });

  it('throws on invalid format', () => {
    expect(() => parseSince('invalid')).toThrow('Invalid duration');
    expect(() => parseSince('7w')).toThrow('Invalid duration');
    expect(() => parseSince('')).toThrow('Invalid duration');
  });
});

// ─── AuditExporter ────────────────────────────────────────────────────────────

describe('AuditExporter', () => {
  let telemetryDir: string;

  beforeEach(async () => {
    telemetryDir = join(TMP, String(Date.now()));
    await mkdir(telemetryDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(TMP, { recursive: true, force: true });
  });

  function makeSpan(overrides: Record<string, unknown> = {}) {
    return {
      spanId: `span-${Math.random().toString(36).slice(2)}`,
      traceId: 'trace-1',
      name: 'agent.turn',
      startTime: Date.now() - 1000,
      endTime: Date.now(),
      attributes: {
        'agent.id': 'agent-1',
        'agent.model': 'claude-sonnet-4-6',
        'gen_ai.provider': 'anthropic',
        'llm.input_tokens': 100,
        'llm.output_tokens': 50,
        'llm.cost': 0.001,
      },
      ...overrides,
    };
  }

  async function writeTelemetryFile(spans: unknown[]) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    await writeFile(
      join(telemetryDir, `telemetry-${ts}.json`),
      JSON.stringify({ serviceName: 'test', exportedAt: new Date().toISOString(), spans, metrics: {} }),
    );
  }

  it('returns empty array when no telemetry files exist', async () => {
    const exporter = new AuditExporter(telemetryDir);
    const entries = await exporter.loadEntries();
    expect(entries).toEqual([]);
  });

  it('converts agent.turn spans to agent_turn audit entries', async () => {
    await writeTelemetryFile([makeSpan()]);
    const exporter = new AuditExporter(telemetryDir);
    const entries = await exporter.loadEntries();
    expect(entries.length).toBeGreaterThan(0);
    const turn = entries.find(e => e.type === 'agent_turn');
    expect(turn).toBeDefined();
    expect(turn!.model).toBe('claude-sonnet-4-6');
    expect(turn!.provider).toBe('anthropic');
    expect(turn!.inputTokens).toBe(100);
    expect(turn!.outputTokens).toBe(50);
  });

  it('converts tool.call spans to tool_call audit entries', async () => {
    await writeTelemetryFile([makeSpan({
      name: 'tool.call',
      attributes: { 'tool.name': 'bash', 'tool.duration': 42, 'tool.success': true },
    })]);
    const exporter = new AuditExporter(telemetryDir);
    const entries = await exporter.loadEntries();
    const toolEntry = entries.find(e => e.type === 'tool_call');
    expect(toolEntry).toBeDefined();
    expect(toolEntry!.metadata.toolName).toBe('bash');
    expect(toolEntry!.success).toBe(true);
  });

  it('converts agent.handoff spans to handoff audit entries', async () => {
    await writeTelemetryFile([makeSpan({
      name: 'agent.handoff',
      attributes: { 'handoff.from': 'a', 'handoff.to': 'b', 'handoff.context_size': 5000 },
    })]);
    const exporter = new AuditExporter(telemetryDir);
    const entries = await exporter.loadEntries();
    const handoff = entries.find(e => e.type === 'handoff');
    expect(handoff).toBeDefined();
    expect(handoff!.metadata.fromAgent).toBe('a');
    expect(handoff!.metadata.toAgent).toBe('b');
  });

  it('filters entries by since timestamp', async () => {
    const old = makeSpan({ startTime: Date.now() - 10 * 864e5, endTime: Date.now() - 10 * 864e5 + 100 });
    const recent = makeSpan({ startTime: Date.now() - 1000, endTime: Date.now() });
    await writeTelemetryFile([old, recent]);
    const exporter = new AuditExporter(telemetryDir);
    const since = new Date(Date.now() - 2 * 864e5);
    const entries = await exporter.loadEntries(since);
    expect(entries.every(e => new Date(e.timestamp) >= since)).toBe(true);
    expect(entries.length).toBe(1);
  });

  it('reads phase observations from state.json when present', async () => {
    const stateJson = {
      phase: 'build',
      completed: ['think', 'plan'],
      observations: [
        {
          phase: 'think',
          durationMs: 1200,
          errorCount: 0,
          observationScore: 0.9,
          timestamp: new Date().toISOString(),
          observationId: 'obs-1',
          circuitBreakerState: { consecutiveFailures: 0, dispatchCount: 1, totalCost: 0.001 },
        },
      ],
    };
    await writeFile(join(telemetryDir, 'state.json'), JSON.stringify(stateJson));
    const exporter = new AuditExporter(telemetryDir);
    const entries = await exporter.loadEntries();
    const phase = entries.find(e => e.type === 'phase_transition');
    expect(phase).toBeDefined();
    expect(phase!.phase).toBe('think');
    expect(phase!.durationMs).toBe(1200);
    expect(phase!.success).toBe(true);
  });

  it('toJSONL produces one valid JSON object per line', async () => {
    await writeTelemetryFile([makeSpan()]);
    const exporter = new AuditExporter(telemetryDir);
    const entries = await exporter.loadEntries();
    const jsonl = exporter.toJSONL(entries);
    const lines = jsonl.split('\n').filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
      const parsed = JSON.parse(line) as AuditEntry;
      expect(typeof parsed.id).toBe('string');
      expect(typeof parsed.timestamp).toBe('string');
      expect(typeof parsed.type).toBe('string');
    }
  });

  it('toJSON produces a valid JSON array', async () => {
    await writeTelemetryFile([makeSpan()]);
    const exporter = new AuditExporter(telemetryDir);
    const entries = await exporter.loadEntries();
    const json = exporter.toJSON(entries);
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('entries are sorted by timestamp ascending', async () => {
    const s1 = makeSpan({ startTime: Date.now() - 5000, endTime: Date.now() - 4000 });
    const s2 = makeSpan({ startTime: Date.now() - 2000, endTime: Date.now() - 1000 });
    await writeTelemetryFile([s2, s1]); // written out of order
    const exporter = new AuditExporter(telemetryDir);
    const entries = await exporter.loadEntries();
    for (let i = 1; i < entries.length; i++) {
      expect(new Date(entries[i].timestamp) >= new Date(entries[i - 1].timestamp)).toBe(true);
    }
  });

  it('each entry has a unique id', async () => {
    await writeTelemetryFile([makeSpan(), makeSpan(), makeSpan()]);
    const exporter = new AuditExporter(telemetryDir);
    const entries = await exporter.loadEntries();
    const ids = entries.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
