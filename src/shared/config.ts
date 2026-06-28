// Extended VibemateConfig for new modules
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

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
    const parsed = JSON.parse(raw) as Partial<VibemateExtendedConfig>;
    return createDefaultConfig(parsed);
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
