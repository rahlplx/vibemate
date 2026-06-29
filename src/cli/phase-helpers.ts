import Anthropic from '@anthropic-ai/sdk';
import { extractJSON } from '../shared/output-validator.js';

export interface LLMTask {
  id: string;
  title: string;
  description: string;
  milestone: string;
  complexityScore: number;
  executionMode: 'inline' | 'session' | 'subagent';
  acceptanceCriteria: string[];
  dependencies: string[];
  files: string[];
}

export type LLMCallerOverride = (model: string, system: string, user: string) => Promise<string>;

// ─── OpenAI-compatible chat completions (Google + OpenAI) ────────────────────

const PROVIDER_CONFIG: Record<string, { baseUrl: string; envKey: string }> = {
  openai: { baseUrl: 'https://api.openai.com/v1', envKey: 'OPENAI_API_KEY' },
  google: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', envKey: 'GOOGLE_API_KEY' },
};

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number,
  fetchFn: typeof fetch,
): Promise<string> {
  const res = await fetchFn(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });
  if (!res.ok) {
    return `[LLM error — ${model} returned HTTP ${res.status}: ${await res.text().catch(() => 'no body')}]`;
  }
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data?.choices?.[0]?.message?.content ?? '';
}

// ─── LLM call with graceful fallback ─────────────────────────────────────────

export async function callLLM(
  model: string,
  provider: string,
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
  override?: LLMCallerOverride,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<string> {
  if (override) return override(model, systemPrompt, userPrompt);

  if (provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return `[LLM unavailable — ANTHROPIC_API_KEY not set]`;
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  }

  const cfg = PROVIDER_CONFIG[provider];
  if (!cfg) return `[LLM unavailable — unsupported provider "${provider}"]`;

  const apiKey = process.env[cfg.envKey];
  if (!apiKey) return `[LLM unavailable — ${cfg.envKey} not set]`;

  try {
    return await callOpenAICompatible(cfg.baseUrl, apiKey, model, systemPrompt, userPrompt, maxTokens, fetchFn);
  } catch (e) {
    return `[LLM error — ${model}: ${e instanceof Error ? e.message : String(e)}]`;
  }
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

export function buildPlanPrompt(description: string, designDoc: string): string {
  return `You are a senior engineering lead creating a milestone-based task plan.

# Task Description
${description}

# Design Document
${designDoc || '(no design doc yet)'}

Create a comprehensive task plan that includes:
1. Milestones with clear deliverables (M1, M2, M3...)
2. Atomic tasks per milestone
3. Complexity estimates (1-20 scale)
4. Execution mode per task (inline/session/subagent)
5. Dependencies between tasks

Output two sections:

## MARKDOWN_PLAN
(Write task-plan.md content here as markdown with milestones and tasks)

## JSON_TASKS
(Write tasks.json content here as valid JSON object)
\`\`\`json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "...",
      "description": "...",
      "milestone": "M1",
      "complexityScore": 5,
      "executionMode": "inline",
      "acceptanceCriteria": ["..."],
      "dependencies": [],
      "files": ["src/..."]
    }
  ]
}
\`\`\`

Focus on the actual task: "${description}". Make tasks concrete and actionable.`;
}

export function buildBreakPrompt(description: string, taskPlan: string): string {
  return `You are a senior engineer breaking down milestones into atomic implementable tasks.

# Task Description
${description}

# Task Plan
${taskPlan || '(no task plan yet)'}

Break every milestone into atomic tasks (single file or single concern). For each task:
- Write clear acceptance criteria (testable conditions)
- Assign a complexity score (1=trivial, 5=simple, 10=moderate, 15=complex, 20=epic)
- Set execution mode: inline (simple edits), session (multi-file), subagent (independent feature)
- List files that will be created or modified
- List dependency task IDs (must form a DAG — no cycles)

Output valid JSON:
\`\`\`json
{
  "tasks": [
    {
      "id": "task-1",
      "title": "...",
      "description": "...",
      "milestone": "M1",
      "complexityScore": 5,
      "executionMode": "inline",
      "acceptanceCriteria": ["Test passes", "Function handles edge cases"],
      "dependencies": [],
      "files": ["src/module/feature.ts", "tests/module/feature.test.ts"]
    }
  ]
}
\`\`\`

Every task must have at least one acceptance criterion. Complexity scores must be realistic.`;
}

export function buildDesignPrompt(description: string, designDoc: string): string {
  return `You are a UI/UX designer creating wireframe specifications and component hierarchy.

# Task Description
${description}

# Design Document
${designDoc || '(no design doc)'}

Create UI specifications for this task. Output two sections:

## WIREFRAMES
(Describe key screens and layouts in markdown — wireframe with ASCII art or descriptions)
Focus on: navigation, key flows, form layouts, error states, loading states.

## COMPONENTS
(List component hierarchy in markdown)
For each component: name, props, responsibilities, child components.

Make the wireframes specific to: "${description}".`;
}

// ─── LLM output parser ────────────────────────────────────────────────────────

let _taskSeq = 0;

export function parseLLMTasks(raw: string): LLMTask[] {
  // 1. Strip markdown code fences
  const stripped = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '');

  // 2. Try to extract JSON object
  const jsonStr = extractJSON(stripped) ?? extractJSON(raw);
  if (!jsonStr) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== 'object') return [];
  const obj = parsed as Record<string, unknown>;
  if (!Array.isArray(obj['tasks'])) return [];

  const rawTasks = obj['tasks'] as unknown[];
  return rawTasks.map((t, i) => {
    const task = (t && typeof t === 'object' ? t : {}) as Record<string, unknown>;
    return {
      id: typeof task['id'] === 'string' && task['id'] ? task['id'] : `task-${Date.now()}-${++_taskSeq}-${i}`,
      title: typeof task['title'] === 'string' ? task['title'] : `Task ${i + 1}`,
      description: typeof task['description'] === 'string' ? task['description'] : '',
      milestone: typeof task['milestone'] === 'string' ? task['milestone'] : 'M1',
      complexityScore: typeof task['complexityScore'] === 'number' ? task['complexityScore'] : 5,
      executionMode: (() => {
        const rawMode = task['executionMode'];
        const mode = typeof rawMode === 'string' ? rawMode.replace(/[-_]/g, '').toLowerCase() : '';
        return (['inline', 'session', 'subagent'] as const).includes(mode as 'inline')
          ? (mode as LLMTask['executionMode'])
          : 'inline';
      })(),
      acceptanceCriteria: Array.isArray(task['acceptanceCriteria'])
        ? (task['acceptanceCriteria'] as unknown[]).filter(s => typeof s === 'string') as string[]
        : [],
      dependencies: Array.isArray(task['dependencies'])
        ? (task['dependencies'] as unknown[]).filter(s => typeof s === 'string') as string[]
        : [],
      files: Array.isArray(task['files'])
        ? (task['files'] as unknown[]).filter(s => typeof s === 'string') as string[]
        : [],
    };
  });
}

// ─── Markdown section extractor ───────────────────────────────────────────────

export function extractSection(text: string, heading: string): string {
  const re = new RegExp(`## ${heading}\\s*([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const m = re.exec(text);
  return m ? m[1].trim() : '';
}
