import { describe, it, expect, beforeEach } from 'bun:test';
import { TelemetryCollector } from '../../src/telemetry/collector.js';
import { ContentStore } from '../../src/telemetry/content-store.js';
import type { ToolDefinition, InferenceParams } from '../../src/types.js';
import { rm } from 'fs/promises';

const EXPORT_DIR = '/tmp/test-llm-signals-export';
const CONTENT_DIR = '/tmp/test-llm-signals-content';

async function cleanDirs() {
  await Promise.all([
    rm(EXPORT_DIR, { recursive: true, force: true }),
    rm(CONTENT_DIR, { recursive: true, force: true }),
  ]);
}

function makeCollector() {
  const contentStore = new ContentStore(CONTENT_DIR);
  const collector = new TelemetryCollector({
    enabled: true,
    exportDir: EXPORT_DIR,
    serviceName: 'test',
    serviceVersion: '0.0.1',
    contentStore,
  });
  return { collector, contentStore };
}

const sampleTools: ToolDefinition[] = [
  {
    name: 'bash',
    description: 'Run a bash command',
    inputSchema: {
      type: 'object',
      properties: { command: { type: 'string' } },
      required: ['command'],
    },
  },
  {
    name: 'read_file',
    description: 'Read a file',
    inputSchema: {
      type: 'object',
      properties: { path: { type: 'string' } },
      required: ['path'],
    },
  },
];

const sampleParams: InferenceParams = {
  temperature: 0.7,
  maxTokens: 4096,
  topP: 0.95,
  stopSequences: ['</s>'],
};

describe('Tool definitions in LLMPrompt', () => {
  beforeEach(cleanDirs);

  it('stores tool definitions alongside messages in content store', async () => {
    const { collector, contentStore } = makeCollector();

    const turn = await collector.recordAgentTurn('agent-1', 'claude-sonnet-4-6', 100, 50, 0.001, {
      prompt: {
        system: 'You are an assistant.',
        messages: [{ role: 'user', content: 'List files' }],
        tools: sampleTools,
      },
      response: { content: 'Running bash...', stopReason: 'tool_use' },
    });

    const content = await contentStore.load(turn.spanId);
    expect(content).not.toBeNull();
    expect(content!.prompt?.tools).toHaveLength(2);
    expect(content!.prompt?.tools![0].name).toBe('bash');
    expect(content!.prompt?.tools![1].inputSchema.properties).toBeDefined();
  });

  it('tool definitions round-trip through JSONL export', async () => {
    const { collector } = makeCollector();

    await collector.recordAgentTurn('agent-1', 'claude-sonnet-4-6', 100, 50, 0.001, {
      prompt: { messages: [{ role: 'user', content: 'go' }], tools: sampleTools },
      response: { content: 'ok', stopReason: 'end_turn' },
    });

    const outPath = `${EXPORT_DIR}/tools.jsonl`;
    await collector.exportDeepLearning(outPath);

    const text = await Bun.file(outPath).text();
    const record = JSON.parse(text.trim().split('\n')[0]);
    expect(record.prompt.tools).toHaveLength(2);
    expect(record.prompt.tools[0].name).toBe('bash');
  });

  it('prompt without tools still works', async () => {
    const { collector, contentStore } = makeCollector();
    const turn = await collector.recordAgentTurn('agent-1', 'claude-haiku', 10, 5, 0.0001, {
      prompt: { messages: [{ role: 'user', content: 'hi' }] },
      response: { content: 'hello', stopReason: 'end_turn' },
    });
    const content = await contentStore.load(turn.spanId);
    expect(content!.prompt?.tools).toBeUndefined();
  });
});

describe('InferenceParams capture', () => {
  beforeEach(cleanDirs);

  it('stores inference params in span content', async () => {
    const { collector, contentStore } = makeCollector();

    const turn = await collector.recordAgentTurn('agent-1', 'claude-sonnet-4-6', 100, 50, 0.001, {
      prompt: { messages: [{ role: 'user', content: 'test' }] },
      response: { content: 'done', stopReason: 'end_turn' },
      inferenceParams: sampleParams,
    });

    const content = await contentStore.load(turn.spanId);
    expect(content).not.toBeNull();
    expect(content!.inferenceParams?.temperature).toBe(0.7);
    expect(content!.inferenceParams?.maxTokens).toBe(4096);
    expect(content!.inferenceParams?.topP).toBe(0.95);
    expect(content!.inferenceParams?.stopSequences).toContain('</s>');
  });

  it('inference params round-trip through JSONL export', async () => {
    const { collector } = makeCollector();

    await collector.recordAgentTurn('agent-1', 'claude-sonnet-4-6', 100, 50, 0.001, {
      prompt: { messages: [{ role: 'user', content: 'test' }] },
      response: { content: 'done', stopReason: 'end_turn' },
      inferenceParams: { temperature: 0.1, maxTokens: 1024 },
    });

    const outPath = `${EXPORT_DIR}/params.jsonl`;
    await collector.exportDeepLearning(outPath);
    const record = JSON.parse((await Bun.file(outPath).text()).trim());
    expect(record.inferenceParams.temperature).toBe(0.1);
    expect(record.inferenceParams.maxTokens).toBe(1024);
  });
});

describe('Latency and cache token capture', () => {
  beforeEach(cleanDirs);

  it('stores latencyMs in span content metadata', async () => {
    const { collector, contentStore } = makeCollector();

    const turn = await collector.recordAgentTurn('agent-1', 'claude-sonnet-4-6', 100, 50, 0.001, {
      prompt: { messages: [{ role: 'user', content: 'test' }] },
      response: { content: 'ok', stopReason: 'end_turn' },
      latencyMs: 1234,
    });

    const content = await contentStore.load(turn.spanId);
    expect(content!.metadata.latencyMs).toBe(1234);
  });

  it('stores cache tokens (Anthropic prompt caching)', async () => {
    const { collector, contentStore } = makeCollector();

    const turn = await collector.recordAgentTurn('agent-1', 'claude-sonnet-4-6', 100, 50, 0.001, {
      prompt: { messages: [{ role: 'user', content: 'test' }] },
      response: { content: 'ok', stopReason: 'end_turn' },
      cacheReadTokens: 800,
      cacheCreationTokens: 200,
    });

    const content = await contentStore.load(turn.spanId);
    expect(content!.metadata.cacheReadTokens).toBe(800);
    expect(content!.metadata.cacheCreationTokens).toBe(200);
  });

  it('stores split input/output cost', async () => {
    const { collector, contentStore } = makeCollector();

    const turn = await collector.recordAgentTurn('agent-1', 'claude-sonnet-4-6', 100, 50, 0.001, {
      prompt: { messages: [{ role: 'user', content: 'test' }] },
      response: { content: 'ok', stopReason: 'end_turn' },
      inputCost: 0.0006,
      outputCost: 0.0004,
    });

    const content = await contentStore.load(turn.spanId);
    expect(content!.metadata.inputCost).toBe(0.0006);
    expect(content!.metadata.outputCost).toBe(0.0004);
  });

  it('all new signals appear in JSONL export metadata', async () => {
    const { collector } = makeCollector();

    await collector.recordAgentTurn('agent-1', 'claude-sonnet-4-6', 100, 50, 0.001, {
      prompt: { messages: [{ role: 'user', content: 'test' }], tools: sampleTools },
      response: { content: 'ok', stopReason: 'end_turn' },
      inferenceParams: sampleParams,
      latencyMs: 999,
      cacheReadTokens: 500,
      cacheCreationTokens: 100,
      inputCost: 0.0003,
      outputCost: 0.0007,
    });

    const outPath = `${EXPORT_DIR}/full.jsonl`;
    await collector.exportDeepLearning(outPath);
    const record = JSON.parse((await Bun.file(outPath).text()).trim());

    expect(record.prompt.tools).toHaveLength(2);
    expect(record.inferenceParams.temperature).toBe(0.7);
    expect(record.metadata.latencyMs).toBe(999);
    expect(record.metadata.cacheReadTokens).toBe(500);
    expect(record.metadata.cacheCreationTokens).toBe(100);
    expect(record.metadata.inputCost).toBe(0.0003);
    expect(record.metadata.outputCost).toBe(0.0007);
  });
});
