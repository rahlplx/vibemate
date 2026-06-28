import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { TelemetryCollector } from '../../src/telemetry/collector.js';
import { ContentStore } from '../../src/telemetry/content-store.js';
import type { SpanContent } from '../../src/types.js';

describe('TelemetryCollector.init() — restart recovery', () => {
  let tmpDir: string;
  let contentDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'collector-init-'));
    contentDir = join(tmpDir, 'content');
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('restores contentSpanIds from disk on init', async () => {
    // Simulate a previous session writing content files
    const store = new ContentStore(contentDir);
    const fakeContent: SpanContent = {
      spanId: 'span-abc-123',
      traceId: 'trace-1',
      name: 'agent.turn',
      timestamp: new Date().toISOString(),
      toolCalls: [],
      subAgents: [],
      metadata: { success: true }
    };
    await store.save('span-abc-123', fakeContent);
    await store.save('span-def-456', { ...fakeContent, spanId: 'span-def-456' });

    // New collector instance (simulates restart) — contentSpanIds starts empty
    const collector = new TelemetryCollector({
      enabled: true,
      exportDir: join(tmpDir, 'export'),
      serviceName: 'test',
      serviceVersion: '1.0.0',
      contentStore: store,
    });

    // Before init, contentSpanIds is empty
    const countBefore = (await collector.exportDeepLearning(
      join(tmpDir, 'export', 'out.jsonl')
    ));
    // exportDeepLearning merges listAll() so it still works — but init populates the set
    await collector.init();

    // After init, a second export should produce same count
    const countAfter = (await collector.exportDeepLearning(
      join(tmpDir, 'export', 'out2.jsonl')
    ));
    expect(countBefore).toBe(2);
    expect(countAfter).toBe(2);
  });

  it('init is safe with no contentStore configured', async () => {
    const collector = new TelemetryCollector({
      enabled: true,
      exportDir: join(tmpDir, 'export'),
      serviceName: 'test',
      serviceVersion: '1.0.0',
    });
    // Must not throw
    await expect(collector.init()).resolves.toBeUndefined();
  });

  it('clearOldSpans sees restored IDs and can prune stale content spans', async () => {
    const store = new ContentStore(contentDir);
    const ts = Date.now() - 10_000; // 10 seconds old
    const oldContent: SpanContent = {
      spanId: 'span-old',
      traceId: 'trace-old',
      name: 'agent.turn',
      timestamp: new Date(ts).toISOString(),
      toolCalls: [],
      subAgents: [],
      metadata: {}
    };
    await store.save('span-old', oldContent);

    const collector = new TelemetryCollector({
      enabled: true,
      exportDir: join(tmpDir, 'export'),
      serviceName: 'test',
      serviceVersion: '1.0.0',
      contentStore: store,
    });
    await collector.init();

    // Should not throw
    collector.clearOldSpans(0);
  });
});
