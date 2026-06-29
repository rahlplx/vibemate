// Extended VibemateConfig for new modules
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const VibemateConfigSchema = z.object({
  version: z.string().optional(),
  stateDir: z.string().optional(),
  databaseFile: z.string().optional(),
  telemetryEnabled: z.boolean().optional(),
  evolutionCadence: z.enum(['task', 'daily', 'weekly']).optional(),
  maxComplexityForInline: z.number().optional(),
  maxComplexityForSession: z.number().optional(),
  budget: z.number().nonnegative().optional(),
  llmProviders: z.array(z.object({
    name: z.string(),
    apiKey: z.string(),
    model: z.string(),
    maxTokens: z.number(),
    costPer1kInput: z.number(),
    costPer1kOutput: z.number(),
  })).optional(),
  mineRepos: z.array(z.string()).optional(),
  mineDepth: z.number().int().positive().optional(),
  systemPrompt: z.string().optional(),
  phasePrompts: z.record(z.string()).optional(),
  promptRoles: z.array(z.string()).optional(),
  promptAutoEvolve: z.boolean().optional(),
  promptEvolveCadence: z.enum(['daily', 'weekly', 'monthly']).optional(),
  orgPromptUrl: z.string().url().optional(),
}).passthrough();

export interface LLMProviderConfig {
  name: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export interface VibemateExtendedConfig {
  version: string;
  stateDir: string;
  databaseFile: string;
  telemetryEnabled: boolean;
  evolutionCadence: 'task' | 'daily' | 'weekly';
  maxComplexityForInline: number;
  maxComplexityForSession: number;
  budget: number;
  llmProviders: LLMProviderConfig[];
  mineRepos?: string[];
  mineDepth?: number;
  // ─── Prompt System ───────────────────────────────────────────────────────────
  /** Global system prompt prepended to every phase */
  systemPrompt?: string;
  /** Per-phase system prompt overrides (keys: think, plan, build, harness, …) */
  phasePrompts?: Record<string, string>;
  /** IDs of built-in registry prompts to activate (e.g. ['typescript-engineer','tdd-practitioner']) */
  promptRoles?: string[];
  /** Enable auto-evolution of prompts based on telemetry outcomes */
  promptAutoEvolve?: boolean;
  /** How often to run prompt evolution (default: weekly, matching evolutionCadence) */
  promptEvolveCadence?: 'daily' | 'weekly' | 'monthly';
  /** HTTPS URL to a JSON file containing org-shared prompt templates */
  orgPromptUrl?: string;
}

type ConfigOverrides = Partial<VibemateExtendedConfig>;

const DEFAULT_CONFIG: VibemateExtendedConfig = {
  version: '1.0.0',
  stateDir: '.vibe',
  databaseFile: 'state.db',
  telemetryEnabled: true,
  evolutionCadence: 'task',
  maxComplexityForInline: 5,
  maxComplexityForSession: 15,
  budget: 10.0,
  llmProviders: [],
  mineRepos: [],
  mineDepth: 100,
  promptRoles: [],
  promptAutoEvolve: false,
  promptEvolveCadence: 'weekly',
};

export function createDefaultConfig(overrides?: ConfigOverrides): VibemateExtendedConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

export interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
}

export function loadConfig(rootDir: string = process.cwd()): VibemateExtendedConfig {
  const configPath = join(rootDir, 'vibemate.config.json');
  if (!existsSync(configPath)) {
    return createDefaultConfig();
  }
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const result = VibemateConfigSchema.safeParse(JSON.parse(raw));
    const parsed = result.success ? result.data : {};
    return createDefaultConfig(parsed as Partial<VibemateExtendedConfig>);
  } catch {
    return createDefaultConfig();
  }
}

export function validateConfig(config: VibemateExtendedConfig): ConfigValidationResult {
  const errors: string[] = [];

  if (config.budget < 0) {
    errors.push('budget must be non-negative');
  }

  if (!['task', 'daily', 'weekly'].includes(config.evolutionCadence)) {
    errors.push('evolutionCadence must be "task", "daily", or "weekly"');
  }

  if (config.maxComplexityForInline >= config.maxComplexityForSession) {
    errors.push('maxComplexityForInline must be less than maxComplexityForSession');
  }

  if (config.maxComplexityForInline < 0) {
    errors.push('maxComplexityForInline must be non-negative');
  }

  if (config.maxComplexityForSession < 1) {
    errors.push('maxComplexityForSession must be at least 1');
  }

  return { valid: errors.length === 0, errors };
}
