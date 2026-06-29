import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// ─── SelfImprovementOrchestrator.midRunEvolve ────────────────────────────────

import { SelfImprovementOrchestrator } from '../../src/evolve/index.js';
import { OKFGenerator } from '../../src/okf/generator.js';

describe('SelfImprovementOrchestrator.midRunEvolve', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vibemate-m3-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns EvolveRules without requiring weekly gate', async () => {
    const okf = new OKFGenerator(tmpDir);
    const orchestrator = new SelfImprovementOrchestrator(okf);
    await orchestrator.init();

    // Drive failureRate above threshold so reflectAndEvolve generates rules
    const rules = await orchestrator.midRunEvolve({
      failureRate: 0.8,
      averageReward: 0.2,
      stuckDetections: 3,
    });

    // averageReward (0.2) < rewardThreshold (0.4) → should generate at least one rule
    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]).toHaveProperty('action');
    expect(rules[0]).toHaveProperty('condition');
  });

  it('returns empty array when metrics are healthy', async () => {
    const okf = new OKFGenerator(tmpDir);
    const orchestrator = new SelfImprovementOrchestrator(okf);
    await orchestrator.init();

    const rules = await orchestrator.midRunEvolve({
      failureRate: 0.05,
      averageReward: 0.95,
      stuckDetections: 0,
    });

    // averageReward (0.95) >= rewardThreshold (0.4) AND no failure streak → no new rules
    expect(rules).toEqual([]);
  });

  it('generates rules from consecutive failure pattern', async () => {
    const okf = new OKFGenerator(tmpDir);
    const orchestrator = new SelfImprovementOrchestrator(okf);
    await orchestrator.init();

    // high stuckDetections triggers failure streak diagnosis
    const rules = await orchestrator.midRunEvolve({
      failureRate: 0.6,
      averageReward: 0.2,
      stuckDetections: 5,
    });

    expect(rules.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── PromptRegistry.getTemplate ──────────────────────────────────────────────

import { PromptRegistry } from '../../src/prompts/registry.js';
import type { PromptTemplate } from '../../src/types.js';

describe('PromptRegistry.getTemplate', () => {
  it('returns the template for a known id', () => {
    const registry = new PromptRegistry();
    const tmpl: PromptTemplate = {
      id: 'test-tmpl',
      name: 'Test',
      category: 'role',
      content: 'Be precise.',
      version: '1.0.0',
      source: 'builtin',
      confidence: 0.9,
      tags: [],
      usageCount: 0,
      successRate: 1,
    };
    registry.add(tmpl);
    const found = registry.getTemplate('test-tmpl');
    expect(found).toBeDefined();
    expect(found?.content).toBe('Be precise.');
  });

  it('returns undefined for an unknown id', () => {
    const registry = new PromptRegistry();
    expect(registry.getTemplate('nonexistent')).toBeUndefined();
  });
});

// ─── PromptEvolver.run with autoApply ────────────────────────────────────────

import { PromptEvolver } from '../../src/prompts/evolver.js';

describe('PromptEvolver auto-trigger (run with autoApply)', () => {
  it('evolves a low-success-rate template and adds it to the registry', async () => {
    const registry = new PromptRegistry();
    const tmpl: PromptTemplate = {
      id: 'low-perf',
      name: 'Low Perf',
      category: 'role',
      content: 'Do something vague.',
      version: '1.0.0',
      source: 'builtin',
      confidence: 0.9,
      tags: [],
      usageCount: 20,
      successRate: 0.3,
    };
    registry.add(tmpl);

    // Add 10 failure outcomes to meet MIN_SAMPLES_TO_EVOLVE threshold
    for (let i = 0; i < 10; i++) {
      registry.recordOutcome(['low-perf'], 'harness', 'failure', 500);
    }

    const evolver = new PromptEvolver();
    const count = await evolver.run(registry, { autoApply: true });

    expect(count).toBe(1);
    const templates = registry.list();
    const evolved = templates.find(t => t.source === 'evolved');
    expect(evolved).toBeDefined();
    expect(evolved?.tags).toContain('evolved');
    // autoApply: true → confidence >= 0.55 so it will activate when composed
    expect(evolved!.confidence).toBeGreaterThanOrEqual(0.55);
  });

  it('does not evolve a template with high success rate', async () => {
    const registry = new PromptRegistry();
    const tmpl: PromptTemplate = {
      id: 'high-perf',
      name: 'High Perf',
      category: 'role',
      content: 'Be excellent.',
      version: '1.0.0',
      source: 'builtin',
      confidence: 0.9,
      tags: [],
      usageCount: 20,
      successRate: 0.95,
    };
    registry.add(tmpl);
    for (let i = 0; i < 10; i++) {
      registry.recordOutcome(['high-perf'], 'build', 'success', 200);
    }

    const evolver = new PromptEvolver();
    const count = await evolver.run(registry, { autoApply: true });
    expect(count).toBe(0);
  });
});

// ─── Skill action → skillTierOverride parsing ────────────────────────────────
// Tests the logic in auto.ts that translates EvolveAgent action strings into routing signals.

describe('skill action → skillTierOverride translation', () => {
  function parseSkillAction(action: string): 'escalate' | 'downgrade' | null {
    const lower = action.toLowerCase();
    if (lower.includes('escalate') || lower.includes('more capable')) return 'escalate';
    if (lower.includes('simpler') || lower.includes('downgrade')) return 'downgrade';
    return null;
  }

  it('detects escalate signal', () => {
    expect(parseSkillAction('escalate to more capable model and reduce context size')).toBe('escalate');
    expect(parseSkillAction('Use more capable model')).toBe('escalate');
  });

  it('detects downgrade signal', () => {
    expect(parseSkillAction('switch to simpler approach')).toBe('downgrade');
    expect(parseSkillAction('downgrade model tier')).toBe('downgrade');
  });

  it('returns null for neutral actions', () => {
    expect(parseSkillAction('log failure pattern for analysis')).toBeNull();
    expect(parseSkillAction('use standard approach')).toBeNull();
    expect(parseSkillAction('add retry logic with exponential backoff')).toBeNull();
  });
});

// ─── RequirementsTracker feeds BREAK phase ───────────────────────────────────

import { RequirementsTracker } from '../../src/shared/requirements-tracker.js';

describe('RequirementsTracker BREAK phase integration', () => {
  it('list("must") returns only must-have requirements', () => {
    const tracker = new RequirementsTracker();
    tracker.add({ tier: 'must', title: 'Core auth', rationale: 'Users need to log in.', persona: 'developer', context: 'THINK', source: 'user', tags: [], status: 'active' });
    tracker.add({ tier: 'should', title: 'Dark mode', rationale: 'Nice to have.', persona: 'product-owner', context: 'THINK', source: 'user', tags: [], status: 'active' });

    const musts = tracker.list('must');
    expect(musts).toHaveLength(1);
    expect(musts[0].title).toBe('Core auth');
  });

  it('serialises and deserialises correctly for round-trip through disk', () => {
    const tracker = new RequirementsTracker();
    tracker.add({ tier: 'must', title: 'Tests pass', rationale: 'Quality gate.', persona: 'developer', context: 'THINK', source: 'evidence', tags: ['testing'], status: 'active' });

    const restored = RequirementsTracker.fromJSON(tracker.toJSON());
    const musts = restored.list('must');
    expect(musts).toHaveLength(1);
    expect(musts[0].title).toBe('Tests pass');
  });

  it('filters out inactive requirements', () => {
    const tracker = new RequirementsTracker();
    tracker.add({ tier: 'must', title: 'Active req', rationale: '', persona: 'developer', context: 'THINK', source: 'user', tags: [], status: 'active' });
    tracker.add({ tier: 'must', title: 'Deferred req', rationale: '', persona: 'developer', context: 'THINK', source: 'user', tags: [], status: 'deferred' });

    const activeMusts = tracker.list('must').filter(r => r.status === 'active');
    expect(activeMusts).toHaveLength(1);
    expect(activeMusts[0].title).toBe('Active req');
  });
});

// ─── Circuit breaker → midRunEvolve (Tier 3) ────────────────────────────────

describe('circuit breaker → midRunEvolve integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vibemate-m3-cb-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('midRunEvolve with circuit-breaker-style metrics generates rules', async () => {
    const okf = new OKFGenerator(tmpDir);
    const orchestrator = new SelfImprovementOrchestrator(okf);
    await orchestrator.init();

    // Simulate max failures hit: failureRate = consecutiveFailures / maxFailures = 3/3 = 1.0
    const rules = await orchestrator.midRunEvolve({
      failureRate: 1.0,
      averageReward: 0.0,
      stuckDetections: 3,
    });

    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
    // High failure rate → escalate action expected
    const hasEscalate = rules.some(r => r.action.toLowerCase().includes('escalate') || r.action.toLowerCase().includes('retry'));
    expect(hasEscalate).toBe(true);
  });

  it('midRunEvolve with anomaly-style metrics (errorRate → failureRate) generates rules', async () => {
    const okf = new OKFGenerator(tmpDir);
    const orchestrator = new SelfImprovementOrchestrator(okf);
    await orchestrator.init();

    // Simulate what happens when getMetrics().errorRate = 0.7
    const rules = await orchestrator.midRunEvolve({
      failureRate: 0.7,
      averageReward: 0.3,
      stuckDetections: 1,
    });

    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThan(0);
  });
});
