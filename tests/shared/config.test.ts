import { describe, it, expect } from 'vitest';
import {
  createDefaultConfig,
  validateConfig,
  type VibemateExtendedConfig,
} from '../../src/shared/config.js';

describe('createDefaultConfig', () => {
  it('creates config with sensible defaults', () => {
    const config = createDefaultConfig();
    expect(config.version).toBe('1.0.0');
    expect(config.stateDir).toBe('.vibe');
    expect(config.databaseFile).toBe('state.db');
    expect(config.telemetryEnabled).toBe(true);
    expect(config.evolutionCadence).toBe('task');
    expect(config.maxComplexityForInline).toBe(5);
    expect(config.maxComplexityForSession).toBe(15);
    expect(config.budget).toBe(10.0);
  });

  it('allows overrides', () => {
    const config = createDefaultConfig({ budget: 50.0, telemetryEnabled: false });
    expect(config.budget).toBe(50.0);
    expect(config.telemetryEnabled).toBe(false);
    // Defaults preserved
    expect(config.version).toBe('1.0.0');
  });
});

describe('validateConfig', () => {
  it('returns valid for default config', () => {
    const config = createDefaultConfig();
    const result = validateConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects negative budget', () => {
    const config = createDefaultConfig({ budget: -10 });
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('budget'))).toBe(true);
  });

  it('rejects invalid evolution cadence', () => {
    const config = createDefaultConfig({ evolutionCadence: 'invalid' as any });
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('evolutionCadence'))).toBe(true);
  });

  it('rejects max complexity for inline >= max complexity for session', () => {
    const config = createDefaultConfig({
      maxComplexityForInline: 20,
      maxComplexityForSession: 15,
    });
    const result = validateConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('complexity'))).toBe(true);
  });
});

describe('VibemateExtendedConfig type', () => {
  it('has all required fields', () => {
    const config = createDefaultConfig();
    expect(config).toHaveProperty('version');
    expect(config).toHaveProperty('stateDir');
    expect(config).toHaveProperty('databaseFile');
    expect(config).toHaveProperty('telemetryEnabled');
    expect(config).toHaveProperty('evolutionCadence');
    expect(config).toHaveProperty('maxComplexityForInline');
    expect(config).toHaveProperty('maxComplexityForSession');
    expect(config).toHaveProperty('budget');
    expect(config).toHaveProperty('llmProviders');
  });
});
