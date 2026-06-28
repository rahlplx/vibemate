import { describe, it, expect, beforeEach } from 'bun:test';
import { ContentStore } from '../../src/telemetry/content-store.js';
import type { SpanContent } from '../../src/types.js';
import { rm } from 'fs/promises';

const TEST_DIR = '/tmp/test-content-store';

async function cleanDir() {
  await rm(TEST_DIR, { recursive: true, force: true });
}

function makeContent(spanId: string): SpanContent {
  return {
    spanId,
    traceId: 'trace-1',
    name: 'agent.turn',
    timestamp: new Date().toISOString(),
    prompt: {
      system: 'You are a helpful assistant.',
      messages: [{ role: 'user', content: 'Write a function that adds two numbers.' }]
    },
    response: {
      content: 'Here is the function:\n```ts\nfunction add(a: number, b: number) { return a + b; }\n```',
      thinking: 'The user wants a simple add function.',
      stopReason: 'end_turn'
    },
    toolCalls: [],
    subAgents: [],
    metadata: { model: 'claude-sonnet', phase: 'BUILD', success: true }
  };
}

describe('ContentStore', () => {
  let store: ContentStore;

  beforeEach(async () => {
    await cleanDir();
    store = new ContentStore(TEST_DIR);
  });

  it('save and load roundtrip', async () => {
    const content = makeContent('span-1');
    await store.save('span-1', content);
    const loaded = await store.load('span-1');
    expect(loaded).not.toBeNull();
    expect(loaded!.spanId).toBe('span-1');
    expect(loaded!.prompt!.system).toBe('You are a helpful assistant.');
    expect(loaded!.response!.thinking).toBe('The user wants a simple add function.');
  });

  it('load returns null for missing spanId', async () => {
    const result = await store.load('nonexistent');
    expect(result).toBeNull();
  });

  it('listAll returns all saved spanIds', async () => {
    await store.save('span-a', makeContent('span-a'));
    await store.save('span-b', makeContent('span-b'));
    await store.save('span-c', makeContent('span-c'));
    const ids = await store.listAll();
    expect(ids).toContain('span-a');
    expect(ids).toContain('span-b');
    expect(ids).toContain('span-c');
    expect(ids).toHaveLength(3);
  });

  it('exportAsJSONL writes one valid JSON object per line', async () => {
    await store.save('span-x', makeContent('span-x'));
    await store.save('span-y', { ...makeContent('span-y'), spanId: 'span-y' });

    const outPath = `${TEST_DIR}/export.jsonl`;
    const count = await store.exportAsJSONL(['span-x', 'span-y'], outPath);
    expect(count).toBe(2);

    const text = await Bun.file(outPath).text();
    const lines = text.trim().split('\n');
    expect(lines).toHaveLength(2);

    const record0 = JSON.parse(lines[0]);
    expect(record0.spanId).toBe('span-x');
    expect(record0.prompt.system).toBe('You are a helpful assistant.');
    expect(typeof record0.response.content).toBe('string');
  });

  it('exportAsJSONL skips missing spanIds silently', async () => {
    await store.save('span-real', makeContent('span-real'));
    const outPath = `${TEST_DIR}/export-partial.jsonl`;
    const count = await store.exportAsJSONL(['span-real', 'span-ghost'], outPath);
    expect(count).toBe(1);
  });
});
