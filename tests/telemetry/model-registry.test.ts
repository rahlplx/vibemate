import { describe, it, expect } from 'bun:test';
import { resolveModel, resolveAgentType } from '../../src/telemetry/model-registry.js';

describe('resolveModel', () => {
  it('resolves claude-sonnet-4-6 to anthropic', () => {
    const info = resolveModel('claude-sonnet-4-6');
    expect(info.provider).toBe('anthropic');
    expect(info.family).toBe('claude-4');
    expect(info.shorthand).toBe('claude-sonnet');
  });

  it('resolves claude-opus-4-20250514 to anthropic claude-opus', () => {
    const info = resolveModel('claude-opus-4-20250514');
    expect(info.provider).toBe('anthropic');
    expect(info.shorthand).toBe('claude-opus');
  });

  it('resolves claude-haiku-4-5-20251001 to anthropic', () => {
    const info = resolveModel('claude-haiku-4-5-20251001');
    expect(info.provider).toBe('anthropic');
    expect(info.shorthand).toBe('claude-haiku');
  });

  it('resolves gemini-2.5-flash to google', () => {
    const info = resolveModel('gemini-2.5-flash');
    expect(info.provider).toBe('google');
    expect(info.family).toBe('gemini-2.5');
  });

  it('resolves gemini-2.5-pro to google', () => {
    const info = resolveModel('gemini-2.5-pro');
    expect(info.provider).toBe('google');
    expect(info.shorthand).toBe('gemini-pro');
  });

  it('resolves gpt-4o-mini to openai', () => {
    const info = resolveModel('gpt-4o-mini');
    expect(info.provider).toBe('openai');
    expect(info.family).toBe('gpt-4o');
  });

  it('resolves o3-mini to openai', () => {
    const info = resolveModel('o3-mini');
    expect(info.provider).toBe('openai');
    expect(info.family).toBe('o3');
  });

  it('infers anthropic from unknown claude model', () => {
    const info = resolveModel('claude-something-new');
    expect(info.provider).toBe('anthropic');
    expect(info.family).toBe('claude-unknown');
  });

  it('infers google from unknown gemini model', () => {
    const info = resolveModel('gemini-99-pro');
    expect(info.provider).toBe('google');
  });

  it('returns unknown for unrecognized model', () => {
    const info = resolveModel('mystery-model-xyz');
    expect(info.provider).toBe('unknown');
    expect(info.shorthand).toBe('mystery-model-xyz');
    expect(info.fullId).toBe('mystery-model-xyz');
  });

  it('is case-insensitive', () => {
    const info = resolveModel('GPT-4O-MINI');
    expect(info.provider).toBe('openai');
  });

  it('infers openai from unknown gpt model (gpt-3.5-turbo)', () => {
    const info = resolveModel('gpt-3.5-turbo');
    expect(info.provider).toBe('openai');
    expect(info.family).toBe('gpt-unknown');
  });

  it('infers openai from gpt-3.5-turbo (gpt inference fallback)', () => {
    const info = resolveModel('gpt-3.5-turbo');
    expect(info.provider).toBe('openai');
    expect(info.family).toBe('gpt-unknown');
  });
});

describe('resolveAgentType', () => {
  it('returns claude-code for claude-related strings', () => {
    expect(resolveAgentType('claude-code')).toBe('claude-code');
    expect(resolveAgentType('Claude Code 1.0')).toBe('claude-code');
  });

  it('returns cursor for cursor-related strings', () => {
    expect(resolveAgentType('cursor-agent')).toBe('cursor');
  });

  it('returns codex for codex-related strings', () => {
    expect(resolveAgentType('codex')).toBe('codex');
  });

  it('returns unknown for undefined input', () => {
    expect(resolveAgentType(undefined)).toBe('unknown');
  });

  it('returns unknown for empty string', () => {
    expect(resolveAgentType('')).toBe('unknown');
  });

  it('returns kilocode for kilocode strings', () => {
    expect(resolveAgentType('kilocode-v2')).toBe('kilocode');
  });

  it('returns openhands for openhands strings', () => {
    expect(resolveAgentType('openhands')).toBe('openhands');
  });
});
