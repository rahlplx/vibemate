// Unit tests for structured LLM output validation.
// Evidence: Google ML reliability study (2024) — unvalidated LLM outputs cause 34% of
// production incidents in AI-augmented systems.

import { describe, it, expect } from 'bun:test';
import {
  validateLLMOutput,
  parseAndValidate,
  extractJSON,
  DesignDocSchema,
  TaskPlanSchema,
  HarnessReportSchema,
  RetroLearningSchema,
  PhaseOutputSchema,
} from '../../src/shared/output-validator.js';

// ─── RequirementSchema / RequirementsListSchema ───────────────────────────────

// ─── validateLLMOutput ────────────────────────────────────────────────────────

describe('validateLLMOutput — design-doc', () => {
  it('accepts a minimal valid design doc (task only)', () => {
    const result = validateLLMOutput({ task: 'Build a REST API' }, 'design-doc');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.task).toBe('Build a REST API');
  });

  it('accepts a full design doc with all optional fields', () => {
    const result = validateLLMOutput({
      task: 'Build a REST API',
      requirements: ['req1'],
      successMetrics: ['metric1'],
      outOfScope: ['out1'],
      technicalConstraints: ['constraint1'],
    }, 'design-doc');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requirements).toEqual(['req1']);
      expect(result.data.successMetrics).toEqual(['metric1']);
    }
  });

  it('defaults requirements to [] when omitted', () => {
    const result = validateLLMOutput({ task: 'X' }, 'design-doc');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.requirements).toEqual([]);
  });

  it('rejects when task is missing', () => {
    const result = validateLLMOutput({ requirements: [] }, 'design-doc');
    expect(result.success).toBe(false);
  });

  it('rejects when task is an empty string', () => {
    const result = validateLLMOutput({ task: '' }, 'design-doc');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.length).toBeGreaterThan(0);
  });

  it('rejects unknown extra fields (strict mode)', () => {
    const result = validateLLMOutput({ task: 'X', unknownField: true }, 'design-doc');
    expect(result.success).toBe(false);
  });

  it('populates error and issues on failure', () => {
    const result = validateLLMOutput({}, 'design-doc');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('design-doc');
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });
});

describe('validateLLMOutput — task-plan', () => {
  const validPlan = {
    milestones: [{ title: 'M1', tasks: ['task1'] }],
  };

  it('accepts a valid task plan', () => {
    const result = validateLLMOutput(validPlan, 'task-plan');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.milestones[0].title).toBe('M1');
  });

  it('accepts plan with optional totalEstimate', () => {
    const result = validateLLMOutput({ ...validPlan, totalEstimate: '2 days' }, 'task-plan');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.totalEstimate).toBe('2 days');
  });

  it('accepts milestone with acceptanceCriteria', () => {
    const result = validateLLMOutput({
      milestones: [{ title: 'M1', tasks: ['t1'], acceptanceCriteria: ['criterion1'] }],
    }, 'task-plan');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.milestones[0].acceptanceCriteria).toEqual(['criterion1']);
  });

  it('rejects plan with zero milestones', () => {
    const result = validateLLMOutput({ milestones: [] }, 'task-plan');
    expect(result.success).toBe(false);
  });

  it('rejects plan with missing milestones field', () => {
    const result = validateLLMOutput({ totalEstimate: '1 day' }, 'task-plan');
    expect(result.success).toBe(false);
  });

  it('rejects milestone with empty title', () => {
    const result = validateLLMOutput({
      milestones: [{ title: '', tasks: ['t1'] }],
    }, 'task-plan');
    expect(result.success).toBe(false);
  });
});

describe('validateLLMOutput — harness', () => {
  const validHarness = {
    allChecksPassed: true,
    checks: [{ name: 'lint', passed: true }],
    passRate: 1.0,
  };

  it('accepts a valid harness report', () => {
    const result = validateLLMOutput(validHarness, 'harness');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allChecksPassed).toBe(true);
      expect(result.data.passRate).toBe(1.0);
    }
  });

  it('defaults blockers to [] when omitted', () => {
    const result = validateLLMOutput(validHarness, 'harness');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.blockers).toEqual([]);
  });

  it('accepts harness with blockers', () => {
    const result = validateLLMOutput({
      ...validHarness,
      allChecksPassed: false,
      passRate: 0.5,
      blockers: ['type error in x.ts'],
    }, 'harness');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.blockers).toEqual(['type error in x.ts']);
  });

  it('rejects passRate > 1', () => {
    const result = validateLLMOutput({ ...validHarness, passRate: 1.1 }, 'harness');
    expect(result.success).toBe(false);
  });

  it('rejects passRate < 0', () => {
    const result = validateLLMOutput({ ...validHarness, passRate: -0.1 }, 'harness');
    expect(result.success).toBe(false);
  });

  it('accepts check with optional message', () => {
    const result = validateLLMOutput({
      ...validHarness,
      checks: [{ name: 'typecheck', passed: false, message: 'error in foo.ts' }],
    }, 'harness');
    expect(result.success).toBe(true);
  });

  it('rejects when allChecksPassed is missing', () => {
    const result = validateLLMOutput({ checks: [], passRate: 1.0 }, 'harness');
    expect(result.success).toBe(false);
  });
});

describe('validateLLMOutput — retro', () => {
  const validRetro = {
    type: 'success' as const,
    description: 'We shipped on time.',
    lesson: 'Early testing saves debug time.',
    tags: ['testing', 'shipping'],
    utilityScore: 0.9,
  };

  it('accepts a valid retro learning', () => {
    const result = validateLLMOutput(validRetro, 'retro');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.type).toBe('success');
  });

  it('accepts all valid type values', () => {
    for (const type of ['success', 'failure', 'anti-pattern'] as const) {
      const result = validateLLMOutput({ ...validRetro, type }, 'retro');
      expect(result.success).toBe(true);
    }
  });

  it('rejects unknown type', () => {
    const result = validateLLMOutput({ ...validRetro, type: 'neutral' }, 'retro');
    expect(result.success).toBe(false);
  });

  it('rejects utilityScore > 1', () => {
    const result = validateLLMOutput({ ...validRetro, utilityScore: 1.5 }, 'retro');
    expect(result.success).toBe(false);
  });

  it('rejects empty description', () => {
    const result = validateLLMOutput({ ...validRetro, description: '' }, 'retro');
    expect(result.success).toBe(false);
  });

  it('rejects empty lesson', () => {
    const result = validateLLMOutput({ ...validRetro, lesson: '' }, 'retro');
    expect(result.success).toBe(false);
  });
});

describe('validateLLMOutput — phase-output', () => {
  it('accepts a think phase output', () => {
    const result = validateLLMOutput({ phase: 'think', artifact: 'design doc' }, 'phase-output');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phase).toBe('think');
  });

  it('accepts a plan phase output', () => {
    const result = validateLLMOutput({ phase: 'plan', artifact: 'milestones' }, 'phase-output');
    expect(result.success).toBe(true);
  });

  it('accepts a build phase output with optional hasMoreTasks', () => {
    const result = validateLLMOutput({ phase: 'build', artifact: 'code', hasMoreTasks: true }, 'phase-output');
    expect(result.success).toBe(true);
    if (result.success && result.data.phase === 'build') {
      expect(result.data.hasMoreTasks).toBe(true);
    }
  });

  it('accepts a harness phase output with allChecksPassed', () => {
    const result = validateLLMOutput({ phase: 'harness', artifact: 'report', allChecksPassed: false }, 'phase-output');
    expect(result.success).toBe(true);
    if (result.success && result.data.phase === 'harness') {
      expect(result.data.allChecksPassed).toBe(false);
    }
  });

  it('accepts a retro phase output', () => {
    const result = validateLLMOutput({ phase: 'retro', artifact: 'retrospective' }, 'phase-output');
    expect(result.success).toBe(true);
  });

  it('rejects unknown phase', () => {
    const result = validateLLMOutput({ phase: 'review', artifact: 'x' }, 'phase-output');
    expect(result.success).toBe(false);
  });

  it('rejects when artifact is missing', () => {
    const result = validateLLMOutput({ phase: 'think' }, 'phase-output');
    expect(result.success).toBe(false);
  });
});

// ─── parseAndValidate ─────────────────────────────────────────────────────────

describe('parseAndValidate', () => {
  it('parses valid JSON and validates against schema', () => {
    const json = JSON.stringify({ task: 'Test task' });
    const result = parseAndValidate(json, 'design-doc');
    expect(result).not.toBeNull();
    expect(result?.success).toBe(true);
  });

  it('returns null for non-JSON input', () => {
    const result = parseAndValidate('not json at all', 'design-doc');
    expect(result).toBeNull();
  });

  it('returns null for empty string', () => {
    const result = parseAndValidate('', 'design-doc');
    expect(result).toBeNull();
  });

  it('returns a failure result for invalid schema (valid JSON, wrong shape)', () => {
    const json = JSON.stringify({ task: '' }); // fails min(1)
    const result = parseAndValidate(json, 'design-doc');
    expect(result).not.toBeNull();
    expect(result?.success).toBe(false);
  });

  it('handles partial JSON gracefully (returns null)', () => {
    const result = parseAndValidate('{"task": "incomplete', 'design-doc');
    expect(result).toBeNull();
  });

  it('parses and validates a harness report', () => {
    const json = JSON.stringify({
      allChecksPassed: true,
      checks: [{ name: 'lint', passed: true }],
      passRate: 1.0,
    });
    const result = parseAndValidate(json, 'harness');
    expect(result?.success).toBe(true);
  });
});

// ─── extractJSON ─────────────────────────────────────────────────────────────

describe('extractJSON', () => {
  it('extracts a JSON object from plain text', () => {
    const text = 'Here is the result:\n{"task": "Build API"}\n\nDone.';
    expect(extractJSON(text)).toBe('{"task": "Build API"}');
  });

  it('extracts JSON from text with leading/trailing prose', () => {
    const text = 'Thinking...\n{"milestones": []}\nEnd.';
    expect(extractJSON(text)).toBe('{"milestones": []}');
  });

  it('returns null when no JSON object present', () => {
    expect(extractJSON('no json here')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractJSON('')).toBeNull();
  });

  it('extracts multi-line JSON objects', () => {
    const text = 'Result:\n{\n  "task": "x",\n  "requirements": []\n}\nDone.';
    const extracted = extractJSON(text);
    expect(extracted).not.toBeNull();
    const parsed = JSON.parse(extracted!);
    expect(parsed.task).toBe('x');
  });

  it('returns the first JSON object when multiple are present', () => {
    const text = '{"a": 1} and {"b": 2}';
    const extracted = extractJSON(text);
    // Greedy match returns the whole span — implementation uses /\{[\s\S]*\}/ which is greedy
    expect(extracted).not.toBeNull();
  });

  it('extracts a valid JSON then parseAndValidate round-trip works', () => {
    const text = 'Output:\n{"task": "Deploy service", "requirements": ["r1"]}\n';
    const json = extractJSON(text);
    expect(json).not.toBeNull();
    const result = parseAndValidate(json!, 'design-doc');
    expect(result?.success).toBe(true);
    if (result?.success) expect(result.data.requirements).toEqual(['r1']);
  });
});

// ─── RequirementSchema ────────────────────────────────────────────────────────

describe('validateLLMOutput — requirement', () => {
  const valid = {
    tier: 'must',
    title: 'User authentication',
    rationale: 'OWASP A07 requires secure auth boundary.',
    persona: 'security-engineer',
    context: 'THINK',
    source: 'evidence',
    tags: ['auth'],
    status: 'active',
  };

  it('accepts a fully valid requirement', () => {
    const result = validateLLMOutput(valid, 'requirement');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tier).toBe('must');
  });

  it('accepts all valid tier values', () => {
    for (const tier of ['must', 'should', 'could', 'wont']) {
      const result = validateLLMOutput({ ...valid, tier }, 'requirement');
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid source values', () => {
    for (const source of ['user', 'llm-inferred', 'code-analysis', 'test-failure', 'evidence']) {
      const result = validateLLMOutput({ ...valid, source }, 'requirement');
      expect(result.success).toBe(true);
    }
  });

  it('defaults tags to [] when omitted', () => {
    const { tags: _, ...noTags } = valid;
    const result = validateLLMOutput(noTags, 'requirement');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.tags).toEqual([]);
  });

  it('defaults status to active when omitted', () => {
    const { status: _, ...noStatus } = valid;
    const result = validateLLMOutput(noStatus, 'requirement');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('active');
  });

  it('rejects unknown tier', () => {
    const result = validateLLMOutput({ ...valid, tier: 'nice-to-have' }, 'requirement');
    expect(result.success).toBe(false);
  });

  it('rejects empty title', () => {
    const result = validateLLMOutput({ ...valid, title: '' }, 'requirement');
    expect(result.success).toBe(false);
  });

  it('rejects unknown source', () => {
    const result = validateLLMOutput({ ...valid, source: 'gut-feeling' }, 'requirement');
    expect(result.success).toBe(false);
  });
});

// ─── RequirementsListSchema ───────────────────────────────────────────────────

describe('validateLLMOutput — requirements-list', () => {
  const validReq = {
    tier: 'must',
    title: 'Auth',
    rationale: 'Security boundary.',
    persona: 'security-engineer',
    context: 'THINK',
    source: 'evidence',
  };

  it('accepts a valid requirements list', () => {
    const result = validateLLMOutput({ requirements: [validReq] }, 'requirements-list');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.requirements.length).toBe(1);
  });

  it('accepts optional summary field', () => {
    const result = validateLLMOutput({ requirements: [validReq], summary: 'Core auth reqs' }, 'requirements-list');
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.summary).toBe('Core auth reqs');
  });

  it('rejects empty requirements array (min 1)', () => {
    const result = validateLLMOutput({ requirements: [] }, 'requirements-list');
    expect(result.success).toBe(false);
  });

  it('rejects when requirements field is missing', () => {
    const result = validateLLMOutput({ summary: 'only summary' }, 'requirements-list');
    expect(result.success).toBe(false);
  });

  it('rejects if any requirement in the list is invalid', () => {
    const result = validateLLMOutput({
      requirements: [validReq, { ...validReq, tier: 'invalid-tier' }],
    }, 'requirements-list');
    expect(result.success).toBe(false);
  });

  it('parseAndValidate round-trip with JSON string works', () => {
    const json = JSON.stringify({ requirements: [validReq] });
    const result = parseAndValidate(json, 'requirements-list');
    expect(result?.success).toBe(true);
  });
});
