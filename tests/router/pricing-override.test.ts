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
