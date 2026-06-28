// Prompt Registry — curated built-in prompts + user/org/evolved management.
// Edge-safe: no top-level Node.js imports; all I/O is optional (pass adapter or use in-memory).
// Evidence sources: Google SWE practices, Anthropic prompt engineering guide (2024),
// OpenAI system prompt best-practices, Microsoft Research prompt survey (2024).

import type { PromptTemplate, PromptOutcome, ComposedPrompt, PromptCategory } from '../types.js';

// ─── Built-in curated prompts ─────────────────────────────────────────────────
// These ship with vibemate. Evidence: each practice is traceable to a known
// engineering standard (linked in comments).

export const BUILT_IN_PROMPTS: PromptTemplate[] = [
  {
    id: 'typescript-engineer',
    name: 'TypeScript Engineer',
    category: 'role',
    content: [
      'You are a senior TypeScript engineer with strict-mode discipline.',
      'Prefer: explicit return types on public APIs; discriminated unions over type assertions;',
      'utility types (Partial, Readonly, Pick, Record) to reduce repetition;',
      'functional patterns (map/filter/reduce) over imperative mutation.',
      'Never use `any` — use `unknown` and narrow with guards.',
      'Keep types co-located with their consumers unless explicitly shared.',
    ].join(' '),
    version: '1.0.0',
    source: 'built-in',
    confidence: 0.95,
    tags: ['typescript', 'strict', 'types'],
    usageCount: 0,
    successRate: 0,
  },
  {
    id: 'tdd-practitioner',
    name: 'TDD Practitioner',
    category: 'testing',
    content: [
      'Follow strict TDD: write a failing test first, then the minimal implementation to pass it, then refactor.',
      'Every public function has at least one unit test.',
      'Use property-based testing (fast-check) for algebraic invariants.',
      'Target 90%+ line coverage; mutation score matters more than raw coverage.',
      'Mock at the boundary (network, file I/O, time) — not internal implementation.',
    ].join(' '),
    version: '1.0.0',
    source: 'built-in',
    confidence: 0.95,
    tags: ['tdd', 'testing', 'coverage', 'fast-check'],
    usageCount: 0,
    successRate: 0,
  },
  {
    id: 'security-first',
    name: 'Security-First Engineer',
    category: 'security',
    content: [
      'Apply OWASP Top 10 discipline to every change.',
      'Validate all external input at system boundaries; trust nothing from outside.',
      'Never log secrets, PII, or tokens — use placeholders in logs.',
      'Prefer parameterized queries over string interpolation.',
      'Use Content-Security-Policy, HTTPS-only, and principle of least privilege.',
      'Secrets go in env vars — never in code, config files, or logs.',
    ].join(' '),
    version: '1.0.0',
    source: 'built-in',
    confidence: 0.95,
    tags: ['owasp', 'security', 'dlp', 'auth'],
    usageCount: 0,
    successRate: 0,
  },
  {
    id: 'api-designer',
    name: 'API Designer',
    category: 'domain',
    content: [
      'Design APIs contract-first: schema before implementation.',
      'Follow REST resource naming (nouns, plural) and HTTP semantics (GET idempotent, POST non-idempotent).',
      'Version APIs from day one (/v1/).',
      'Return consistent error shapes: { error: { code, message, details } }.',
      'Use pagination (cursor-based) for list endpoints, not offset.',
      'Provide OpenAPI 3.1 spec alongside every API.',
    ].join(' '),
    version: '1.0.0',
    source: 'built-in',
    confidence: 0.9,
    tags: ['api', 'rest', 'openapi', 'versioning'],
    usageCount: 0,
    successRate: 0,
  },
  {
    id: 'observability-engineer',
    name: 'Observability Engineer',
    category: 'domain',
    content: [
      'Instrument every significant operation with structured logs (JSON), metrics, and traces.',
      'Use OpenTelemetry semantic conventions for span names and attributes.',
      'Every error is logged with: timestamp, traceId, errorKind, and contextual metadata.',
      'Health endpoints expose: uptime, version, dependency status.',
      'Alerts are actionable — no alert without a runbook.',
    ].join(' '),
    version: '1.0.0',
    source: 'built-in',
    confidence: 0.9,
    tags: ['observability', 'otel', 'logging', 'tracing'],
    usageCount: 0,
    successRate: 0,
  },
  {
    id: 'edge-first',
    name: 'Edge-First Engineer',
    category: 'framework',
    content: [
      'Design for edge runtimes: no top-level Node.js imports; use dynamic import() for Node-specific code.',
      'All I/O behind adapters (StorageAdapter, FetchAdapter) — swap without changing business logic.',
      'Use native fetch(), Web Crypto API, and platform-agnostic constructs.',
      'Tree-shake aggressively: import only what is used.',
      'Test with in-memory adapters — zero I/O in unit tests.',
    ].join(' '),
    version: '1.0.0',
    source: 'built-in',
    confidence: 0.9,
    tags: ['edge', 'cloudflare', 'deno', 'bun', 'adapter'],
    usageCount: 0,
    successRate: 0,
  },
  {
    id: 'functional-programmer',
    name: 'Functional Programmer',
    category: 'role',
    content: [
      'Prefer pure functions with no side effects for business logic.',
      'Use immutable data: Object.freeze, spread operators, map/filter/reduce.',
      'Avoid class state when a plain function suffices.',
      'Compose small, single-purpose functions into pipelines.',
      'Make side effects explicit and push them to the edges of the system.',
    ].join(' '),
    version: '1.0.0',
    source: 'built-in',
    confidence: 0.85,
    tags: ['functional', 'immutable', 'pure', 'composition'],
    usageCount: 0,
    successRate: 0,
  },
  {
    id: 'ci-cd-engineer',
    name: 'CI/CD Engineer',
    category: 'domain',
    content: [
      'Every commit is deployable: CI gate catches failures before merge.',
      'Build artifacts are immutable and content-addressed (hash in name).',
      'Deployments are incremental and reversible — blue/green or canary.',
      'Feature flags decouple deploy from release.',
      'DORA metrics (deployment frequency, lead time, change failure rate, MTTR) guide process.',
    ].join(' '),
    version: '1.0.0',
    source: 'built-in',
    confidence: 0.85,
    tags: ['ci', 'cd', 'dora', 'deploy', 'feature-flags'],
    usageCount: 0,
    successRate: 0,
  },
];

// ─── PromptRegistry ───────────────────────────────────────────────────────────

const VIBEMATE_BASE_PERSONA = [
  'You are Vibemate, an expert AI engineering assistant.',
  'You follow evidence-based engineering practices.',
  'You are concise, precise, and write production-quality code.',
  'You never omit error handling at system boundaries.',
  'When uncertain, you say so and provide the safest option.',
].join(' ');

export class PromptRegistry {
  private templates = new Map<string, PromptTemplate>();
  private outcomes: PromptOutcome[] = [];

  constructor(seed: PromptTemplate[] = BUILT_IN_PROMPTS) {
    for (const t of seed) this.templates.set(t.id, { ...t });
  }

  get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  list(category?: PromptCategory): PromptTemplate[] {
    const all = [...this.templates.values()].map(t => ({ ...t }));
    return category ? all.filter(t => t.category === category) : all;
  }

  add(template: PromptTemplate): void {
    this.templates.set(template.id, { ...template });
  }

  remove(id: string): boolean {
    return this.templates.delete(id);
  }

  /** Record a phase outcome for a set of active template IDs. */
  recordOutcome(activeIds: string[], phase: string, outcome: 'success' | 'failure', durationMs: number): void {
    const ts = new Date().toISOString();
    for (const id of activeIds) {
      this.outcomes.push({ templateId: id, phase, outcome, retryCount: 0, durationMs, timestamp: ts });
      const t = this.templates.get(id);
      if (t) this._updateStats(t, outcome);
    }
  }

  private _updateStats(t: PromptTemplate, outcome: 'success' | 'failure'): void {
    const prev = t.successRate * t.usageCount;
    t.usageCount++;
    t.successRate = (prev + (outcome === 'success' ? 1 : 0)) / t.usageCount;
  }

  getOutcomes(): PromptOutcome[] { return [...this.outcomes]; }

  /**
   * Compose the full system prompt for a given phase.
   * Layer order: base persona → active roles → user system prompt → phase override → org prompts.
   */
  compose(options: {
    activeRoleIds?: string[];
    systemPrompt?: string;
    phasePrompts?: Record<string, string>;
    orgTemplates?: PromptTemplate[];
    phase?: string;
    minConfidence?: number;
  } = {}): ComposedPrompt {
    const { activeRoleIds = [], systemPrompt, phasePrompts, orgTemplates = [], phase, minConfidence = 0.5 } = options;
    const parts: string[] = [VIBEMATE_BASE_PERSONA];
    const activeTemplateIds: string[] = [];

    for (const id of activeRoleIds) {
      const t = this.templates.get(id);
      if (t && t.confidence >= minConfidence) {
        parts.push(t.content);
        activeTemplateIds.push(id);
      }
    }

    for (const t of orgTemplates) {
      if (t.confidence >= minConfidence) {
        parts.push(t.content);
        activeTemplateIds.push(t.id);
      }
    }

    if (systemPrompt?.trim()) parts.push(systemPrompt.trim());

    const phaseOverride = phase ? phasePrompts?.[phase] : undefined;
    if (phaseOverride?.trim()) parts.push(phaseOverride.trim());

    return {
      systemPrompt: parts.join('\n\n'),
      activeTemplateIds,
      phaseOverride,
    };
  }

  /** Serialise to a plain object for JSON persistence. */
  toJSON(): { templates: PromptTemplate[]; outcomes: PromptOutcome[] } {
    return { templates: [...this.templates.values()], outcomes: this.outcomes };
  }

  /** Restore from a serialised plain object. */
  static fromJSON(data: { templates: PromptTemplate[]; outcomes: PromptOutcome[] }): PromptRegistry {
    const r = new PromptRegistry([]);
    for (const t of data.templates) r.templates.set(t.id, t);
    r.outcomes = data.outcomes ?? [];
    return r;
  }
}

export { VIBEMATE_BASE_PERSONA };
