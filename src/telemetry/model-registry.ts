import type { AgentType } from '../types.js';

export interface ModelInfo {
  provider: 'anthropic' | 'google' | 'openai' | 'unknown';
  shorthand: string;
  fullId: string;
  family: string;
}

const MODEL_MAP: Record<string, ModelInfo> = {
  // Anthropic — haiku
  'claude-haiku-4-5': { provider: 'anthropic', shorthand: 'claude-haiku', fullId: 'claude-haiku-4-5-20251001', family: 'claude-4' },
  'claude-haiku-4-5-20251001': { provider: 'anthropic', shorthand: 'claude-haiku', fullId: 'claude-haiku-4-5-20251001', family: 'claude-4' },
  // Anthropic — sonnet
  'claude-sonnet-4-6': { provider: 'anthropic', shorthand: 'claude-sonnet', fullId: 'claude-sonnet-4-6', family: 'claude-4' },
  'claude-sonnet-4-20250514': { provider: 'anthropic', shorthand: 'claude-sonnet', fullId: 'claude-sonnet-4-20250514', family: 'claude-4' },
  'claude-3-5-sonnet': { provider: 'anthropic', shorthand: 'claude-sonnet', fullId: 'claude-3-5-sonnet', family: 'claude-3' },
  // Anthropic — opus
  'claude-opus-4-20250514': { provider: 'anthropic', shorthand: 'claude-opus', fullId: 'claude-opus-4-20250514', family: 'claude-4' },
  'claude-opus-4-8': { provider: 'anthropic', shorthand: 'claude-opus', fullId: 'claude-opus-4-8', family: 'claude-4' },
  // Google — flash
  'gemini-2.5-flash': { provider: 'google', shorthand: 'gemini-flash', fullId: 'gemini-2.5-flash', family: 'gemini-2.5' },
  'gemini-2.0-flash': { provider: 'google', shorthand: 'gemini-flash', fullId: 'gemini-2.0-flash', family: 'gemini-2.0' },
  // Google — pro
  'gemini-2.5-pro': { provider: 'google', shorthand: 'gemini-pro', fullId: 'gemini-2.5-pro', family: 'gemini-2.5' },
  'gemini-2.0-pro': { provider: 'google', shorthand: 'gemini-pro', fullId: 'gemini-2.0-pro', family: 'gemini-2.0' },
  // OpenAI — gpt-4o family
  'gpt-4o-mini': { provider: 'openai', shorthand: 'gpt-4o-mini', fullId: 'gpt-4o-mini', family: 'gpt-4o' },
  'gpt-4o': { provider: 'openai', shorthand: 'gpt-4o', fullId: 'gpt-4o', family: 'gpt-4o' },
  // OpenAI — o-series
  'o3-mini': { provider: 'openai', shorthand: 'o3-mini', fullId: 'o3-mini', family: 'o3' },
  'o3': { provider: 'openai', shorthand: 'o3', fullId: 'o3', family: 'o3' },
  'o1': { provider: 'openai', shorthand: 'o1', fullId: 'o1', family: 'o1' },
};

export function resolveModel(rawModel: string): ModelInfo {
  const lower = rawModel.toLowerCase();

  if (MODEL_MAP[lower]) return MODEL_MAP[lower];

  // Prefix match: 'claude-sonnet-4-6-preview' → matches 'claude-sonnet-4-6'
  for (const [key, info] of Object.entries(MODEL_MAP)) {
    if (lower.startsWith(key) || key.startsWith(lower)) return info;
  }

  // Provider inference from name fragments
  if (lower.includes('claude')) {
    return { provider: 'anthropic', shorthand: rawModel, fullId: rawModel, family: 'claude-unknown' };
  }
  if (lower.includes('gemini')) {
    return { provider: 'google', shorthand: rawModel, fullId: rawModel, family: 'gemini-unknown' };
  }
  if (lower.includes('gpt') || lower.includes('o3') || lower.includes('o1')) {
    return { provider: 'openai', shorthand: rawModel, fullId: rawModel, family: 'gpt-unknown' };
  }

  return { provider: 'unknown', shorthand: rawModel, fullId: rawModel, family: 'unknown' };
}

export function resolveAgentType(raw?: string): AgentType {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase();
  if (lower.includes('claude')) return 'claude-code';
  if (lower.includes('cursor')) return 'cursor';
  if (lower.includes('codex')) return 'codex';
  if (lower.includes('kilo')) return 'kilocode';
  if (lower.includes('opencode')) return 'opencode';
  if (lower.includes('antigravity')) return 'antigravity';
  if (lower.includes('openhands')) return 'openhands';
  return 'unknown';
}
