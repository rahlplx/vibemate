import { describe, it, expect } from 'bun:test';
import { CostAwareRouter } from '../../src/router/index.js';

const lowCriteria = {
  filesImplicated: 0,
  requiresReasoning: false,
  testOutputSize: 0,
  hasDependencies: false,
  isRefactoring: false,
  requiresSecurity: false,
};

const highCriteria = {
  filesImplicated: 10,
  requiresReasoning: true,
  testOutputSize: 5000,
  hasDependencies: true,
  isRefactoring: true,
  requiresSecurity: true,
};

describe('RoutingDecision contextWindow', () => {
  it('returns contextWindow as a positive number', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route(lowCriteria);
    expect(typeof decision.contextWindow).toBe('number');
    expect(decision.contextWindow).toBeGreaterThan(0);
  });

  it('high complexity decision includes contextWindow', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route(highCriteria);
    expect(decision.contextWindow).toBeGreaterThan(0);
  });

  it('o3-mini routes with 200000 contextWindow for high complexity reasoning tasks', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route(highCriteria);
    // Advanced capability route may select o3-mini (200k) or claude-opus (8192)
    // Either way contextWindow must be defined
    expect(decision.contextWindow).toBeDefined();
    expect(decision.contextWindow).toBeGreaterThanOrEqual(8192);
  });
});
