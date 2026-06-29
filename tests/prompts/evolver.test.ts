import { describe, it, expect } from 'bun:test';
import { PromptEvolver } from '../../src/prompts/evolver.js';
import { PromptRegistry } from '../../src/prompts/registry.js';
import { createMemoryAdapter } from '../../src/context/embeddings.js';
import type { PromptTemplate, PromptOutcome } from '../../src/types.js';

function makeTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: 'test-template',
    name: 'Test',
    category: 'role',
    content: 'Write clean code.',
    version: '1.0.0',
    source: 'built-in',
    confidence: 0.9,
    tags: [],
    usageCount: 0,
    successRate: 0,
    ...overrides,
  };
}

function makeOutcomes(templateId: string, successes: number, failures: number): PromptOutcome[] {
  const outcomes: PromptOutcome[] = [];
  const ts = new Date().toISOString();
  for (let i = 0; i < successes; i++)
    outcomes.push({ templateId, phase: 'build', outcome: 'success', retryCount: 0, durationMs: 100, timestamp: ts });
  for (let i = 0; i < failures; i++)
    outcomes.push({ templateId, phase: 'build', outcome: 'failure', retryCount: 0, durationMs: 200, timestamp: ts });
  return outcomes;
}

// ─── shouldEvolve ─────────────────────────────────────────────────────────────

describe('PromptEvolver — shouldEvolve()', () => {
  const evolver = new PromptEvolver();

  it('returns false when fewer than 10 samples', () => {
    const t = makeTemplate();
    const outcomes = makeOutcomes('test-template', 2, 6);  // 8 total, < 10
    expect(evolver.shouldEvolve(t, outcomes)).toBe(false);
  });

  it('returns false when success rate >= 0.70', () => {
    const t = makeTemplate();
    const outcomes = makeOutcomes('test-template', 8, 2);  // 80% success
    expect(evolver.shouldEvolve(t, outcomes)).toBe(false);
  });

  it('returns true when ≥10 samples and success rate < 0.70', () => {
    const t = makeTemplate();
    const outcomes = makeOutcomes('test-template', 4, 7);  // 11 total, ~36% success
    expect(evolver.shouldEvolve(t, outcomes)).toBe(true);
  });

  it('returns false when already evolved with high confidence', () => {
    const t = makeTemplate({ source: 'evolved', confidence: 0.9 });
    const outcomes = makeOutcomes('test-template', 3, 10); // would otherwise qualify
    expect(evolver.shouldEvolve(t, outcomes)).toBe(false);
  });

  it('returns false when no outcomes exist for this template', () => {
    const t = makeTemplate();
    const outcomes = makeOutcomes('other-template', 3, 10);
    expect(evolver.shouldEvolve(t, outcomes)).toBe(false);
  });
});

// ─── evolve ──────────────────────────────────────────────────────────────────

describe('PromptEvolver — evolve()', () => {
  it('returns a new template with source=evolved', async () => {
    const evolver = new PromptEvolver();
    const t = makeTemplate();
    const outcomes = makeOutcomes('test-template', 2, 9);
    const variant = await evolver.evolve(t, outcomes);
    expect(variant.source).toBe('evolved');
  });

  it('sets evolvedFrom to the parent id', async () => {
    const evolver = new PromptEvolver();
    const t = makeTemplate({ id: 'parent-id' });
    const variant = await evolver.evolve(t, []);
    expect(variant.evolvedFrom).toBe('parent-id');
  });

  it('generates a new unique id', async () => {
    const evolver = new PromptEvolver();
    const t = makeTemplate();
    const variant = await evolver.evolve(t, []);
    expect(variant.id).not.toBe(t.id);
    expect(variant.id).toContain(t.id);
  });

  it('bumps the version', async () => {
    const evolver = new PromptEvolver();
    const t = makeTemplate({ version: '1.0.2' });
    const variant = await evolver.evolve(t, []);
    expect(variant.version).toBe('1.0.3');
  });

  it('initial confidence is below 0.65', async () => {
    const evolver = new PromptEvolver();
    const t = makeTemplate();
    const variant = await evolver.evolve(t, []);
    expect(variant.confidence).toBeLessThan(0.65);
  });

  it('uses LLM fn when provided', async () => {
    let called = false;
    const llmFn = async (_prompt: string) => { called = true; return 'LLM-generated content'; };
    const evolver = new PromptEvolver({ llmFn });
    const t = makeTemplate();
    const outcomes = makeOutcomes('test-template', 1, 5);
    const variant = await evolver.evolve(t, outcomes);
    expect(called).toBe(true);
    expect(variant.content).toBe('LLM-generated content');
  });

  it('falls back to heuristic mutation when no LLM fn', async () => {
    const evolver = new PromptEvolver();
    const t = makeTemplate({ content: 'Original content.' });
    const variant = await evolver.evolve(t, []);
    expect(variant.content.length).toBeGreaterThan('Original content.'.length);
  });

  it('tags the evolved template with "evolved"', async () => {
    const evolver = new PromptEvolver();
    const t = makeTemplate({ tags: ['role'] });
    const variant = await evolver.evolve(t, []);
    expect(variant.tags).toContain('evolved');
    expect(variant.tags).toContain('role');
  });
});

// ─── run ─────────────────────────────────────────────────────────────────────

describe('PromptEvolver — run()', () => {
  it('returns 0 when no templates qualify', async () => {
    const evolver = new PromptEvolver();
    const registry = new PromptRegistry([
      makeTemplate({ id: 'good', usageCount: 0 }),
    ]);
    const count = await evolver.run(registry);
    expect(count).toBe(0);
  });

  it('evolves qualifying templates and adds them to registry', async () => {
    const evolver = new PromptEvolver();
    const t = makeTemplate({ id: 'bad-perf' });
    const registry = new PromptRegistry([t]);
    // Add outcomes directly via recordOutcome
    for (const [o, n] of [['failure', 8], ['success', 3]] as const) {
      for (let i = 0; i < n; i++) {
        registry.recordOutcome(['bad-perf'], 'build', o, 100);
      }
    }
    const count = await evolver.run(registry, { autoApply: true });
    expect(count).toBe(1);
    const evolved = registry.list('role').find(r => r.source === 'evolved');
    expect(evolved).toBeDefined();
  });

  it('with autoApply=false, evolved variant confidence stays below activation threshold', async () => {
    const evolver = new PromptEvolver();
    const t = makeTemplate({ id: 'soft-perf' });
    const registry = new PromptRegistry([t]);
    for (const [o, n] of [['failure', 8], ['success', 3]] as const) {
      for (let i = 0; i < n; i++) registry.recordOutcome(['soft-perf'], 'build', o, 100);
    }
    await evolver.run(registry, { autoApply: false });
    const evolved = registry.list().find(r => r.source === 'evolved');
    expect(evolved?.confidence).toBeLessThan(0.5);
  });
});

// ─── persist / load ───────────────────────────────────────────────────────────

describe('PromptEvolver — persist / load', () => {
  it('persist() writes JSON to the adapter', async () => {
    const adapter = createMemoryAdapter();
    const evolver = new PromptEvolver({ adapter });
    const registry = new PromptRegistry([makeTemplate()]);
    await evolver.persist(registry, 'registry.json');
    const raw = await adapter.read('registry.json');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('load() restores a registry from JSON', async () => {
    const adapter = createMemoryAdapter();
    const evolver = new PromptEvolver({ adapter });
    const registry = new PromptRegistry([makeTemplate({ id: 'persisted' })]);
    await evolver.persist(registry, 'reg.json');
    const restored = await evolver.load('reg.json');
    expect(restored?.get('persisted')?.id).toBe('persisted');
  });

  it('load() returns null when key does not exist', async () => {
    const adapter = createMemoryAdapter();
    const evolver = new PromptEvolver({ adapter });
    expect(await evolver.load('missing.json')).toBeNull();
  });

  it('persist() is no-op when no adapter configured', async () => {
    const evolver = new PromptEvolver();
    const registry = new PromptRegistry([]);
    await expect(evolver.persist(registry, 'key')).resolves.toBeUndefined();
  });

  it('load() returns null when no adapter configured', async () => {
    const evolver = new PromptEvolver();
    expect(await evolver.load('key')).toBeNull();
  });
});
