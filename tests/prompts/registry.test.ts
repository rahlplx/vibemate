import { describe, it, expect } from 'bun:test';
import {
  PromptRegistry,
  BUILT_IN_PROMPTS,
  VIBEMATE_BASE_PERSONA,
} from '../../src/prompts/registry.js';
import type { PromptTemplate } from '../../src/types.js';

// ─── PromptRegistry construction ─────────────────────────────────────────────

describe('PromptRegistry — construction', () => {
  it('seeds with built-in prompts by default', () => {
    const r = new PromptRegistry();
    expect(r.list().length).toBe(BUILT_IN_PROMPTS.length);
  });

  it('seeds with a custom set when provided', () => {
    const custom: PromptTemplate[] = [
      { id: 'x', name: 'X', category: 'role', content: 'test', version: '1.0.0',
        source: 'built-in', confidence: 1, tags: [], usageCount: 0, successRate: 0 },
    ];
    const r = new PromptRegistry(custom);
    expect(r.list().length).toBe(1);
    expect(r.get('x')?.name).toBe('X');
  });

  it('seeds with empty set when [] is passed', () => {
    const r = new PromptRegistry([]);
    expect(r.list().length).toBe(0);
  });
});

// ─── get / list ───────────────────────────────────────────────────────────────

describe('PromptRegistry — get() / list()', () => {
  it('get() returns the template by id', () => {
    const r = new PromptRegistry();
    const t = r.get('typescript-engineer');
    expect(t?.id).toBe('typescript-engineer');
  });

  it('get() returns undefined for unknown id', () => {
    const r = new PromptRegistry();
    expect(r.get('does-not-exist')).toBeUndefined();
  });

  it('list() returns all templates when no category filter', () => {
    const r = new PromptRegistry();
    expect(r.list().length).toBe(BUILT_IN_PROMPTS.length);
  });

  it('list(category) filters by category', () => {
    const r = new PromptRegistry();
    const roles = r.list('role');
    expect(roles.every(t => t.category === 'role')).toBe(true);
    expect(roles.length).toBeGreaterThan(0);
  });

  it('list() returns copies — mutations do not affect registry state', () => {
    const r = new PromptRegistry();
    const [first] = r.list();
    first.name = 'mutated';
    expect(r.get(first.id)?.name).not.toBe('mutated');
  });
});

// ─── add / remove ─────────────────────────────────────────────────────────────

describe('PromptRegistry — add() / remove()', () => {
  it('add() inserts a new template', () => {
    const r = new PromptRegistry([]);
    r.add({ id: 'new', name: 'New', category: 'role', content: 'c', version: '1.0.0',
      source: 'user', confidence: 0.8, tags: [], usageCount: 0, successRate: 0 });
    expect(r.get('new')?.name).toBe('New');
  });

  it('add() overwrites an existing template with the same id', () => {
    const r = new PromptRegistry([]);
    r.add({ id: 'dup', name: 'First', category: 'role', content: 'c', version: '1.0.0',
      source: 'user', confidence: 0.5, tags: [], usageCount: 0, successRate: 0 });
    r.add({ id: 'dup', name: 'Second', category: 'role', content: 'c2', version: '1.0.1',
      source: 'evolved', confidence: 0.6, tags: [], usageCount: 0, successRate: 0 });
    expect(r.get('dup')?.name).toBe('Second');
  });

  it('remove() deletes a template and returns true', () => {
    const r = new PromptRegistry([]);
    r.add({ id: 'del', name: 'D', category: 'role', content: 'c', version: '1.0.0',
      source: 'user', confidence: 1, tags: [], usageCount: 0, successRate: 0 });
    expect(r.remove('del')).toBe(true);
    expect(r.get('del')).toBeUndefined();
  });

  it('remove() returns false for unknown id', () => {
    const r = new PromptRegistry([]);
    expect(r.remove('ghost')).toBe(false);
  });
});

// ─── recordOutcome ────────────────────────────────────────────────────────────

describe('PromptRegistry — recordOutcome()', () => {
  it('increments usageCount after recording', () => {
    const r = new PromptRegistry();
    r.recordOutcome(['typescript-engineer'], 'build', 'success', 100);
    expect(r.get('typescript-engineer')?.usageCount).toBe(1);
  });

  it('tracks successRate correctly across outcomes', () => {
    const r = new PromptRegistry();
    r.recordOutcome(['tdd-practitioner'], 'harness', 'success', 100);
    r.recordOutcome(['tdd-practitioner'], 'harness', 'failure', 200);
    r.recordOutcome(['tdd-practitioner'], 'harness', 'success', 150);
    const t = r.get('tdd-practitioner')!;
    expect(t.usageCount).toBe(3);
    expect(t.successRate).toBeCloseTo(2 / 3, 5);
  });

  it('stores outcomes returned by getOutcomes()', () => {
    const r = new PromptRegistry();
    r.recordOutcome(['security-first'], 'review', 'success', 300);
    const outcomes = r.getOutcomes();
    expect(outcomes.some(o => o.templateId === 'security-first' && o.outcome === 'success')).toBe(true);
  });

  it('silently ignores unknown template IDs', () => {
    const r = new PromptRegistry([]);
    expect(() => r.recordOutcome(['ghost-id'], 'build', 'success', 50)).not.toThrow();
  });
});

// ─── compose ─────────────────────────────────────────────────────────────────

describe('PromptRegistry — compose()', () => {
  it('always starts with the base persona', () => {
    const r = new PromptRegistry([]);
    const c = r.compose();
    expect(c.systemPrompt).toContain(VIBEMATE_BASE_PERSONA.slice(0, 30));
  });

  it('includes active role content when IDs are valid', () => {
    const r = new PromptRegistry();
    const c = r.compose({ activeRoleIds: ['typescript-engineer'] });
    expect(c.systemPrompt).toContain('TypeScript');
    expect(c.activeTemplateIds).toContain('typescript-engineer');
  });

  it('excludes templates below minConfidence', () => {
    const r = new PromptRegistry([]);
    r.add({ id: 'low-conf', name: 'L', category: 'role', content: 'low-confidence content',
      version: '1.0.0', source: 'evolved', confidence: 0.3, tags: [], usageCount: 0, successRate: 0 });
    const c = r.compose({ activeRoleIds: ['low-conf'], minConfidence: 0.5 });
    expect(c.systemPrompt).not.toContain('low-confidence content');
    expect(c.activeTemplateIds).not.toContain('low-conf');
  });

  it('includes user systemPrompt when provided', () => {
    const r = new PromptRegistry([]);
    const c = r.compose({ systemPrompt: 'Never use console.log in production.' });
    expect(c.systemPrompt).toContain('Never use console.log in production.');
  });

  it('appends phaseOverride for the matching phase', () => {
    const r = new PromptRegistry([]);
    const c = r.compose({
      phasePrompts: { build: 'Prefer named exports over default exports.' },
      phase: 'build',
    });
    expect(c.systemPrompt).toContain('Prefer named exports');
    expect(c.phaseOverride).toBe('Prefer named exports over default exports.');
  });

  it('does not append phaseOverride for a different phase', () => {
    const r = new PromptRegistry([]);
    const c = r.compose({
      phasePrompts: { build: 'Build-specific instruction.' },
      phase: 'think',
    });
    expect(c.systemPrompt).not.toContain('Build-specific instruction.');
    expect(c.phaseOverride).toBeUndefined();
  });

  it('includes org templates above confidence threshold', () => {
    const r = new PromptRegistry([]);
    const orgTemplate: PromptTemplate = {
      id: 'org-style', name: 'Org Style', category: 'org',
      content: 'Follow our coding standards at standards.corp/guide.',
      version: '1.0.0', source: 'org', confidence: 0.9, tags: [], usageCount: 0, successRate: 0,
    };
    const c = r.compose({ orgTemplates: [orgTemplate] });
    expect(c.systemPrompt).toContain('standards.corp/guide');
    expect(c.activeTemplateIds).toContain('org-style');
  });

  it('returns empty activeTemplateIds when no roles active', () => {
    const r = new PromptRegistry([]);
    const c = r.compose();
    expect(c.activeTemplateIds).toEqual([]);
  });
});

// ─── serialisation ────────────────────────────────────────────────────────────

describe('PromptRegistry — toJSON / fromJSON', () => {
  it('round-trips templates faithfully', () => {
    const r = new PromptRegistry();
    r.recordOutcome(['typescript-engineer'], 'build', 'success', 100);
    const json = r.toJSON();
    const r2 = PromptRegistry.fromJSON(json);
    expect(r2.get('typescript-engineer')?.id).toBe('typescript-engineer');
    expect(r2.getOutcomes().length).toBe(1);
  });

  it('fromJSON handles missing outcomes array gracefully', () => {
    const r = new PromptRegistry([]);
    r.add({ id: 'a', name: 'A', category: 'role', content: 'c', version: '1.0.0',
      source: 'built-in', confidence: 1, tags: [], usageCount: 0, successRate: 0 });
    const json = r.toJSON();
    // @ts-expect-error testing missing field
    delete json.outcomes;
    const r2 = PromptRegistry.fromJSON(json as { templates: PromptTemplate[]; outcomes: never });
    expect(r2.getOutcomes()).toEqual([]);
  });
});
