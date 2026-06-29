// Prompt Evolver — auto-improves prompts based on phase outcome telemetry.
// Evidence: Anthropic's Constitutional AI (2022), DSPy "Automatic Prompt Optimisation" (2023),
// Microsoft Research "EvoPrompt" (2024) — all converge on: measure → identify low performers
// → mutate toward higher success rate → gate with confidence threshold.
//
// This implementation is LLM-agnostic: pass any EmbedFn-compatible generator.
// When no LLM is provided, it uses rule-based heuristics (always available, zero cost).

import type { PromptTemplate, PromptOutcome } from '../types.js';
import { PromptRegistry } from './registry.js';
import type { StorageAdapter } from '../context/embeddings.js';

import { z } from 'zod';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_SAMPLES_TO_EVOLVE = 10;
const SUCCESS_RATE_THRESHOLD = 0.70;  // below this → candidate for evolution
const EVOLVED_INITIAL_CONFIDENCE = 0.55; // start lower; rises as usage data accumulates

// ─── Rule-based heuristic mutations (no LLM required) ────────────────────────

const HEURISTIC_SUFFIXES: Record<string, string> = {
  role:      'Be concise and precise. Prefer the simplest solution that satisfies requirements.',
  testing:   'Run all tests after every change. Never skip a failing test — fix the root cause.',
  security:  'When in doubt, reject input. Fail closed, not open.',
  domain:    'Validate assumptions early. Make non-obvious constraints explicit in names, structure, and tests.',
  framework: 'Prefer the platform\'s native APIs over third-party abstractions when equivalent.',
  evolved:   'Incorporate lessons from past failures. Bias toward proven patterns.',
  org:       'Follow team conventions documented in CLAUDE.md and vibemate.config.json.',
};

function heuristicMutate(template: PromptTemplate): string {
  const suffix = HEURISTIC_SUFFIXES[template.category] ?? '';
  return `${template.content}${suffix ? ' ' + suffix : ''}`;
}

// ─── LLM-based mutation (optional, injected) ──────────────────────────────────

export type EvolveLLMFn = (prompt: string) => Promise<string>;

// ─── PromptEvolver ────────────────────────────────────────────────────────────

export class PromptEvolver {
  private llmFn?: EvolveLLMFn;
  private adapter?: StorageAdapter;

  constructor(options: { llmFn?: EvolveLLMFn; adapter?: StorageAdapter } = {}) {
    this.llmFn = options.llmFn;
    this.adapter = options.adapter;
  }

  /** Returns true when this template has enough data and low enough success rate to evolve. */
  shouldEvolve(template: PromptTemplate, outcomes: PromptOutcome[]): boolean {
    if (template.source === 'evolved' && template.confidence >= 0.85) return false; // already good
    const relevant = outcomes.filter(o => o.templateId === template.id);
    if (relevant.length < MIN_SAMPLES_TO_EVOLVE) return false;
    const successCount = relevant.filter(o => o.outcome === 'success').length;
    return successCount / relevant.length < SUCCESS_RATE_THRESHOLD;
  }

  /** Generate an evolved variant of the template. Uses LLM if provided, else heuristic. */
  async evolve(template: PromptTemplate, outcomes: PromptOutcome[]): Promise<PromptTemplate> {
    let evolvedContent: string;

    if (this.llmFn) {
      const failedPhases = [...new Set(
        outcomes.filter(o => o.templateId === template.id && o.outcome === 'failure').map(o => o.phase)
      )];
      const llmPrompt = [
        'You are a prompt engineer. Improve the following system prompt to increase success rate.',
        `The prompt has failed in phases: ${failedPhases.join(', ')}.`,
        'Make it more precise, actionable, and measurable. Keep it under 200 words.',
        'Return ONLY the improved prompt text, no preamble.',
        '',
        'CURRENT PROMPT:',
        template.content,
      ].join('\n');
      const raw = await this.llmFn(llmPrompt);
      const parsed = z.string().trim().min(1).max(4000).safeParse(raw);
      evolvedContent = parsed.success ? parsed.data : heuristicMutate(template);
    } else {
      evolvedContent = heuristicMutate(template);
    }

    const evolvedId = `${template.id}-evolved-${Date.now()}`;
    return {
      id: evolvedId,
      name: `${template.name} (evolved)`,
      category: template.category,
      content: evolvedContent.trim(),
      version: bumpVersion(template.version),
      source: 'evolved',
      confidence: EVOLVED_INITIAL_CONFIDENCE,
      tags: [...template.tags, 'evolved'],
      usageCount: 0,
      successRate: 0,
      evolvedFrom: template.id,
    };
  }

  /**
   * Full evolution pass over a registry.
   * Returns the number of templates evolved.
   * If `autoApply` is false, new variants are added at low confidence and won't activate
   * until the user explicitly raises their confidence.
   */
  async run(registry: PromptRegistry, options: { autoApply?: boolean } = {}): Promise<number> {
    const { autoApply = false } = options;
    const outcomes = registry.getOutcomes();
    const candidates = registry.list().filter(t => this.shouldEvolve(t, outcomes));
    let evolved = 0;

    for (const template of candidates) {
      const variant = await this.evolve(template, outcomes);
      if (!autoApply) {
        variant.confidence = Math.min(variant.confidence, 0.49); // stays below activation threshold
      }
      registry.add(variant);
      evolved++;
    }

    return evolved;
  }

  /** Persist registry state to the adapter if available. */
  async persist(registry: PromptRegistry, key: string): Promise<void> {
    if (!this.adapter) return;
    await this.adapter.write(key, JSON.stringify(registry.toJSON(), null, 2));
  }

  /** Load registry state from the adapter if available. Returns null when not found. */
  async load(key: string): Promise<PromptRegistry | null> {
    if (!this.adapter) return null;
    try {
      const raw = await this.adapter.read(key);
      return PromptRegistry.fromJSON(JSON.parse(raw));
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'ENOENT') return null;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('not found') || msg.includes('no such file')) return null;
      throw e;
    }
  }
}

function bumpVersion(version: string): string {
  const parts = version.split('.');
  const patch = parseInt(parts[2] ?? '0', 10) + 1;
  return `${parts[0]}.${parts[1]}.${patch}`;
}
