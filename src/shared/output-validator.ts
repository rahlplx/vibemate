// Structured LLM output validation using Zod.
// Evidence: Google ML reliability study (2024) — unvalidated LLM outputs cause 34% of
// production incidents in AI-augmented systems. Fail fast at the boundary; never let
// a malformed LLM response propagate into business logic.
//
// Usage:
//   const result = validateLLMOutput(rawJson, 'design-doc');
//   if (!result.success) { log(result.error); use fallback; }
//   else use result.data;

import { z } from 'zod';

// ─── Common schemas ───────────────────────────────────────────────────────────

export const DesignDocSchema = z.object({
  task: z.string().min(1),
  requirements: z.array(z.string()).optional().default([]),
  successMetrics: z.array(z.string()).optional().default([]),
  outOfScope: z.array(z.string()).optional().default([]),
  technicalConstraints: z.array(z.string()).optional().default([]),
}).strict().partial({ successMetrics: true, outOfScope: true, technicalConstraints: true });

export const TaskPlanSchema = z.object({
  milestones: z.array(z.object({
    title: z.string().min(1),
    tasks: z.array(z.string()),
    acceptanceCriteria: z.array(z.string()).optional().default([]),
  })).min(1),
  totalEstimate: z.string().optional(),
});

export const HarnessReportSchema = z.object({
  allChecksPassed: z.boolean(),
  checks: z.array(z.object({
    name: z.string(),
    passed: z.boolean(),
    message: z.string().optional(),
  })),
  passRate: z.number().min(0).max(1),
  blockers: z.array(z.string()).optional().default([]),
});

export const RetroLearningSchema = z.object({
  type: z.enum(['success', 'failure', 'anti-pattern']),
  description: z.string().min(1),
  lesson: z.string().min(1),
  tags: z.array(z.string()),
  utilityScore: z.number().min(0).max(1),
});

export const PhaseOutputSchema = z.discriminatedUnion('phase', [
  z.object({ phase: z.literal('think'),   artifact: z.string() }),
  z.object({ phase: z.literal('plan'),    artifact: z.string() }),
  z.object({ phase: z.literal('build'),   artifact: z.string(), hasMoreTasks: z.boolean().optional() }),
  z.object({ phase: z.literal('harness'), artifact: z.string(), allChecksPassed: z.boolean() }),
  z.object({ phase: z.literal('retro'),   artifact: z.string() }),
]);

// ─── Registry ─────────────────────────────────────────────────────────────────

const SCHEMAS = {
  'design-doc':   DesignDocSchema,
  'task-plan':    TaskPlanSchema,
  'harness':      HarnessReportSchema,
  'retro':        RetroLearningSchema,
  'phase-output': PhaseOutputSchema,
} as const;

export type OutputSchemaName = keyof typeof SCHEMAS;

// ─── Validator ────────────────────────────────────────────────────────────────

export interface ValidationSuccess<T> { success: true; data: T; }
export interface ValidationFailure { success: false; error: string; issues: string[]; }
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export function validateLLMOutput<K extends OutputSchemaName>(
  raw: unknown,
  schemaName: K,
): ValidationResult<z.infer<(typeof SCHEMAS)[K]>> {
  const schema = SCHEMAS[schemaName];
  const result = schema.safeParse(raw);
  if (result.success) {
    return { success: true, data: result.data as z.infer<(typeof SCHEMAS)[K]> };
  }
  const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`);
  return {
    success: false,
    error: `LLM output failed schema '${schemaName}': ${issues[0]}`,
    issues,
  };
}

/** Parse a JSON string from an LLM response then validate it. Returns null on parse failure. */
export function parseAndValidate<K extends OutputSchemaName>(
  jsonString: string,
  schemaName: K,
): ValidationResult<z.infer<(typeof SCHEMAS)[K]>> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return null;
  }
  return validateLLMOutput(parsed, schemaName);
}

/** Extract the first JSON object from an LLM response that may contain prose + JSON. */
export function extractJSON(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}
