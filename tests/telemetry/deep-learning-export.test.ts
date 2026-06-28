import { describe, it, expect, beforeEach } from 'bun:test';
import { TelemetryCollector } from '../../src/telemetry/collector.js';
import { ContentStore } from '../../src/telemetry/content-store.js';
import type { DeepLearningRecord } from '../../src/types.js';
import { rm } from 'fs/promises';

const EXPORT_DIR = '/tmp/test-dl-export';
const CONTENT_DIR = '/tmp/test-dl-content';

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

describe('Deep-learning content capture', () => {
  beforeEach(async () => {
    await cleanDirs();
  });

  it('recordAgentTurn with prompt+response stores content file', async () => {
    const { collector, contentStore } = makeCollector();
    const turn = await collector.recordAgentTurn('agent-1', 'claude-sonnet', 100, 50, 0.001, {
      prompt: { system: 'You are helpful.', messages: [{ role: 'user', content: 'Hello' }] },
      response: { content: 'Hi there!', stopReason: 'end_turn' }
    });

    const content = await contentStore.load(turn.spanId);
    expect(content).not.toBeNull();
    expect(content!.prompt!.system).toBe('You are helpful.');
    expect(content!.response!.content).toBe('Hi there!');
    expect(content!.metadata.model).toBe('claude-sonnet');
  });

  it('recordAgentTurn without content works as before', async () => {
    const { collector } = makeCollector();
    const turn = await collector.recordAgentTurn('agent-1', 'claude-haiku', 10, 5, 0.0001);
    expect(turn.agentId).toBe('agent-1');
    expect(turn.inputTokens).toBe(10);
  });

  it('recordSubAgent stores sub-agent span with full prompt', async () => {
    const { collector, contentStore } = makeCollector();
    const parentTurn = await collector.recordAgentTurn('parent', 'claude-opus', 200, 100, 0.01);
    const subSpan = await collector.recordSubAgent(parentTurn.spanId, 'child-agent', 'claude-haiku', {
      prompt: { messages: [{ role: 'user', content: 'Summarise this file.' }] },
      response: { content: 'The file contains...', stopReason: 'end_turn' }
    });

    expect(subSpan.parentAgentId).toBe('parent');
    expect(subSpan.childAgentId).toBe('child-agent');

    const content = await contentStore.load(subSpan.spanId);
    expect(content).not.toBeNull();
    expect(content!.prompt!.messages[0].content).toBe('Summarise this file.');
    expect(content!.response!.content).toBe('The file contains...');
  });

  it('recordToolCall stores full (untruncated) I/O in content store', async () => {
    const { collector, contentStore } = makeCollector();
    const largeInput = { query: 'x'.repeat(5000) };
    const largeOutput = { result: 'y'.repeat(5000) };

    const call = await collector.recordToolCall('search', largeInput, largeOutput, 42, true);
    const content = await contentStore.load(call.spanId);
    expect(content).not.toBeNull();
    const savedInput = content!.toolCalls[0]?.input as { query: string };
    expect(savedInput.query).toHaveLength(5000);
    const savedOutput = content!.toolCalls[0]?.output as { result: string };
    expect(savedOutput.result).toHaveLength(5000);
  });

  it('exportDeepLearning produces valid JSONL with expected fields', async () => {
    const { collector } = makeCollector();

    await collector.recordAgentTurn('agent-a', 'claude-sonnet', 300, 150, 0.005, {
      prompt: { system: 'sys', messages: [{ role: 'user', content: 'Do task A' }] },
      response: { content: 'Done A', thinking: 'Thinking about A', stopReason: 'end_turn' }
    });
    await collector.recordToolCall('bash', { cmd: 'ls' }, ['file.ts'], 10, true);
    await collector.recordAgentTurn('agent-b', 'claude-haiku', 50, 25, 0.0003, {
      prompt: { messages: [{ role: 'user', content: 'Do task B' }] },
      response: { content: 'Done B', stopReason: 'end_turn' }
    });

    const outPath = `${EXPORT_DIR}/training.jsonl`;
    const count = await collector.exportDeepLearning(outPath);
    expect(count).toBeGreaterThanOrEqual(2); // at least the 2 agent turns

    const text = await Bun.file(outPath).text();
    const lines = text.trim().split('\n').filter(Boolean);
    expect(lines.length).toBe(count);

    const records: DeepLearningRecord[] = lines.map(l => JSON.parse(l));
    const agentRecords = records.filter(r => r.type === 'agent_turn');
    expect(agentRecords.length).toBe(2);

    const first = agentRecords[0];
    expect(first.prompt?.system).toBe('sys');
    expect(first.response?.content).toBe('Done A');
    expect(first.response?.thinking).toBe('Thinking about A');
    expect(first.metadata.model).toBe('claude-sonnet');
    expect(typeof first.metadata.inputTokens).toBe('number');
  });

  it('bash tool call emits bash_execution type in JSONL', async () => {
    const { collector } = makeCollector();

    await collector.recordToolCall('bash', { command: 'ls -la' }, { stdout: 'file.ts\n' }, 20, true);

    const outPath = `${EXPORT_DIR}/bash.jsonl`;
    const count = await collector.exportDeepLearning(outPath);
    expect(count).toBe(1);

    const text = await Bun.file(outPath).text();
    const record: DeepLearningRecord = JSON.parse(text.trim());
    expect(record.type).toBe('bash_execution');
    expect(record.metadata.command).toBeDefined();
    expect(record.metadata.exitCode).toBe(0);
  });

  it('failed bash call emits exitCode 1', async () => {
    const { collector } = makeCollector();

    await collector.recordToolCall('execute', { command: 'bad-cmd' }, { error: 'not found' }, 5, false);

    const outPath = `${EXPORT_DIR}/bash-fail.jsonl`;
    await collector.exportDeepLearning(outPath);

    const text = await Bun.file(outPath).text();
    const record: DeepLearningRecord = JSON.parse(text.trim());
    expect(record.type).toBe('bash_execution');
    expect(record.metadata.exitCode).toBe(1);
  });

  it('recordFailure emits failure type in JSONL with model info', async () => {
    const { collector } = makeCollector();

    await collector.recordFailure('agent-1', 'claude-sonnet-4-6', new Error('LLM timeout'), {
      phase: 'build',
      prompt: { messages: [{ role: 'user', content: 'Build the thing' }] },
    });

    const outPath = `${EXPORT_DIR}/failure.jsonl`;
    const count = await collector.exportDeepLearning(outPath);
    expect(count).toBe(1);

    const text = await Bun.file(outPath).text();
    const record: DeepLearningRecord = JSON.parse(text.trim());
    expect(record.type).toBe('failure');
    expect(record.metadata.errorKind).toBe('Error');
    expect(record.metadata.errorMessage).toBe('LLM timeout');
    expect(record.metadata.provider).toBe('anthropic');
    expect(record.metadata.modelFamily).toBe('claude-4');
    expect(record.metadata.success).toBe(false);
  });

  it('exportDeepLearning without contentStore falls back to span attributes only', async () => {
    const collector = new TelemetryCollector({
      enabled: true,
      exportDir: EXPORT_DIR,
      serviceName: 'test',
      serviceVersion: '0.0.1',
    });

    collector.recordAgentTurnSync('agent-1', 'claude-haiku', 10, 5, 0.0001);
    const outPath = `${EXPORT_DIR}/fallback.jsonl`;
    const count = await collector.exportDeepLearning(outPath);
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
