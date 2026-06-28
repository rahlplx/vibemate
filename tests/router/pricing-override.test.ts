import { describe, it, expect } from 'bun:test';
import { CostAwareRouter } from '../../src/router/index.js';
import { VibemateExtendedConfig } from '../../src/shared/config.js';

const baseCriteria = {
  filesImplicated: 1,
  requiresReasoning: false,
  testOutputSize: 100,
  hasDependencies: false,
  isRefactoring: false,
  requiresSecurity: false,
};

describe('Router pricing override via VibemateExtendedConfig', () => {
  it('uses hardcoded prices when no config is provided', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route(baseCriteria);
    expect(decision.estimatedCost).toBeGreaterThan(0);
  });

  it('overrides gpt-4o-mini input price from llmProviders config', () => {
    // gpt-4o-mini is the cheapest basic model selected for low-complexity tasks
    const configWithOverride: VibemateExtendedConfig = {
      version: '1.0.0',
      stateDir: '.vibe',
      databaseFile: 'state.db',
      telemetryEnabled: true,
      evolutionCadence: 'task',
      maxComplexityForInline: 5,
      maxComplexityForSession: 15,
      budget: 100,
      llmProviders: [
        {
          name: 'openai',
          apiKey: '',
          model: 'gpt-4o-mini',
          maxTokens: 16384,
          costPer1kInput: 0.005, // 33x default 0.00015
          costPer1kOutput: 0.02  // 33x default 0.0006
        }
      ]
    };

    const defaultRouter = new CostAwareRouter([], 100);
    const overrideRouter = new CostAwareRouter([], 100, configWithOverride);

    const defaultDecision = defaultRouter.route(baseCriteria);
    const overrideDecision = overrideRouter.route(baseCriteria);

    // Override prices are 33x higher — estimated cost must increase
    expect(overrideDecision.estimatedCost).toBeGreaterThan(defaultDecision.estimatedCost);
  });

  it('falls back to hardcoded when llmProviders is empty', () => {
    const emptyConfig: VibemateExtendedConfig = {
      version: '1.0.0',
      stateDir: '.vibe',
      databaseFile: 'state.db',
      telemetryEnabled: true,
      evolutionCadence: 'task',
      maxComplexityForInline: 5,
      maxComplexityForSession: 15,
      budget: 100,
      llmProviders: []
    };

    const defaultRouter = new CostAwareRouter([], 100);
    const emptyConfigRouter = new CostAwareRouter([], 100, emptyConfig);

    const d1 = defaultRouter.route(baseCriteria);
    const d2 = emptyConfigRouter.route(baseCriteria);

    expect(d1.estimatedCost).toBe(d2.estimatedCost);
  });

  it('overrides price when config uses full model ID instead of shorthand key', () => {
    // MODEL_CONFIGS shorthand 'claude-opus' has model: 'claude-opus-4-20250514'
    // A user might pass the full model ID — should match via v.model lookup, not just key match
    const configWithFullModelId: VibemateExtendedConfig = {
      version: '1.0.0',
      stateDir: '.vibe',
      databaseFile: 'state.db',
      telemetryEnabled: true,
      evolutionCadence: 'task',
      maxComplexityForInline: 5,
      maxComplexityForSession: 15,
      budget: 100,
      llmProviders: [
        {
          name: 'anthropic',
          apiKey: '',
          model: 'claude-opus-4-20250514', // full model ID, not the shorthand key 'claude-opus'
          maxTokens: 8192,
          costPer1kInput: 1.0,  // 66x default 0.015
          costPer1kOutput: 4.0  // 53x default 0.075
        }
      ]
    };

    const defaultRouter = new CostAwareRouter([], 100);
    const overrideRouter = new CostAwareRouter([], 100, configWithFullModelId);

    // High complexity so claude-opus (advanced) is selected by selectMostCapable
    const highCriteria = { ...baseCriteria, requiresReasoning: true, requiresSecurity: true, filesImplicated: 5 };
    expect(overrideRouter.route(highCriteria).estimatedCost).toBeGreaterThan(
      defaultRouter.route(highCriteria).estimatedCost
    );
  });

  it('ignores unknown model names in llmProviders', () => {
    const configWithUnknown: VibemateExtendedConfig = {
      version: '1.0.0',
      stateDir: '.vibe',
      databaseFile: 'state.db',
      telemetryEnabled: true,
      evolutionCadence: 'task',
      maxComplexityForInline: 5,
      maxComplexityForSession: 15,
      budget: 100,
      llmProviders: [
        {
          name: 'fantasy',
          apiKey: '',
          model: 'gpt-99-ultra',
          maxTokens: 8192,
          costPer1kInput: 99.0,
          costPer1kOutput: 99.0
        }
      ]
    };

    const defaultRouter = new CostAwareRouter([], 100);
    const overrideRouter = new CostAwareRouter([], 100, configWithUnknown);

    const d1 = defaultRouter.route(baseCriteria);
    const d2 = overrideRouter.route(baseCriteria);

    // Should be identical — unknown model key ignored
    expect(d1.estimatedCost).toBe(d2.estimatedCost);
  });
});
