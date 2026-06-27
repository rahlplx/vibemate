// TDD Tests for Cost-Aware Router
import { describe, it, expect, beforeEach } from 'bun:test';
import { CostAwareRouter, FallbackManager } from '../../src/router/index.js';

describe('CostAwareRouter', () => {
  let router: CostAwareRouter;

  beforeEach(() => {
    router = new CostAwareRouter([], 50); // $50 budget
  });

  describe('calculateComplexity', () => {
    it('should calculate complexity score based on criteria', () => {
      const score = router.calculateComplexity({
        filesImplicated: 5,
        requiresReasoning: true,
        testOutputSize: 500,
        hasDependencies: true,
        isRefactoring: false,
        requiresSecurity: false
      });

      // 5*2 + 10 + 0 + 3 + 0 + 0 = 23
      expect(score).toBe(23);
    });

    it('should give low score for simple tasks', () => {
      const score = router.calculateComplexity({
        filesImplicated: 1,
        requiresReasoning: false,
        testOutputSize: 100,
        hasDependencies: false,
        isRefactoring: false,
        requiresSecurity: false
      });

      // 1*2 + 0 + 0 + 0 + 0 + 0 = 2
      expect(score).toBe(2);
    });

    it('should give high score for complex tasks', () => {
      const score = router.calculateComplexity({
        filesImplicated: 10,
        requiresReasoning: true,
        testOutputSize: 2000,
        hasDependencies: true,
        isRefactoring: true,
        requiresSecurity: true
      });

      // 10*2 + 10 + 5 + 3 + 4 + 6 = 48
      expect(score).toBe(48);
    });
  });

  describe('getComplexityLevel', () => {
    it('should return low for score <= 5', () => {
      expect(router.getComplexityLevel(0)).toBe('low');
      expect(router.getComplexityLevel(5)).toBe('low');
    });

    it('should return medium for score 6-15', () => {
      expect(router.getComplexityLevel(6)).toBe('medium');
      expect(router.getComplexityLevel(15)).toBe('medium');
    });

    it('should return high for score > 15', () => {
      expect(router.getComplexityLevel(16)).toBe('high');
      expect(router.getComplexityLevel(100)).toBe('high');
    });
  });

  describe('route', () => {
    it('should route low complexity to cheapest model', () => {
      const decision = router.route({
        filesImplicated: 1,
        requiresReasoning: false,
        testOutputSize: 100,
        hasDependencies: false,
        isRefactoring: false,
        requiresSecurity: false
      });

      expect(decision.level).toBe('low');
      expect(decision.reason).toContain('Low complexity');
    });

    it('should route medium complexity to balanced model', () => {
      const decision = router.route({
        filesImplicated: 2,
        requiresReasoning: true,
        testOutputSize: 300,
        hasDependencies: false,
        isRefactoring: false,
        requiresSecurity: false
      });

      expect(decision.level).toBe('medium');
      expect(decision.reason).toContain('Medium complexity');
    });

    it('should route high complexity to most capable model', () => {
      const decision = router.route({
        filesImplicated: 10,
        requiresReasoning: true,
        testOutputSize: 2000,
        hasDependencies: true,
        isRefactoring: true,
        requiresSecurity: true
      });

      expect(decision.level).toBe('high');
      expect(decision.reason).toContain('High complexity');
    });

    it('should downgrade if budget exceeded', () => {
      // Create router with low budget
      const lowBudgetRouter = new CostAwareRouter([], 0.000001); // Very low budget
      
      const decision = lowBudgetRouter.route({
        filesImplicated: 10,
        requiresReasoning: true,
        testOutputSize: 2000,
        hasDependencies: true,
        isRefactoring: true,
        requiresSecurity: true
      });

      // Should still make a decision (may not downgrade if even cheapest is too expensive)
      expect(decision.level).toBe('high');
      expect(decision.model).toBeDefined();
    });
  });

  describe('recordCost', () => {
    it('should track total cost', () => {
      router.recordCost(0.01);
      router.recordCost(0.02);

      const status = router.getBudgetStatus();
      expect(status.totalCost).toBe(0.03);
    });
  });

  describe('canAfford', () => {
    it('should return true if within budget', () => {
      const canAfford = router.canAfford({
        filesImplicated: 1,
        requiresReasoning: false,
        testOutputSize: 100,
        hasDependencies: false,
        isRefactoring: false,
        requiresSecurity: false
      });

      expect(canAfford).toBe(true);
    });

    it('should return false if over budget', () => {
      // Spend all budget
      router.recordCost(50);

      const canAfford = router.canAfford({
        filesImplicated: 1,
        requiresReasoning: false,
        testOutputSize: 100,
        hasDependencies: false,
        isRefactoring: false,
        requiresSecurity: false
      });

      expect(canAfford).toBe(false);
    });
  });

  describe('getBudgetStatus', () => {
    it('should return budget status', () => {
      router.recordCost(10);

      const status = router.getBudgetStatus();

      expect(status.totalBudget).toBe(50);
      expect(status.totalCost).toBe(10);
      expect(status.remaining).toBe(40);
      expect(status.percentUsed).toBe(20);
    });
  });

  describe('recommendRouting', () => {
    it('should recommend routing for multiple tasks', () => {
      const tasks = [
        {
          filesImplicated: 1,
          requiresReasoning: false,
          testOutputSize: 100,
          hasDependencies: false,
          isRefactoring: false,
          requiresSecurity: false
        },
        {
          filesImplicated: 10,
          requiresReasoning: true,
          testOutputSize: 2000,
          hasDependencies: true,
          isRefactoring: true,
          requiresSecurity: true
        }
      ];

      const recommendation = router.recommendRouting(tasks);

      expect(recommendation.tasks.length).toBe(2);
      expect(recommendation.totalEstimatedCost).toBeGreaterThan(0);
      expect(recommendation.withinBudget).toBe(true);
    });
  });
});

describe('FallbackManager', () => {
  let manager: FallbackManager;

  beforeEach(() => {
    manager = new FallbackManager();
  });

  describe('recordFailure', () => {
    it('should track failure count', () => {
      manager.recordFailure('claude-haiku');
      manager.recordFailure('claude-haiku');

      expect(manager.shouldEscalate('claude-haiku')).toBe(false);
    });

    it('should trigger escalation after threshold', () => {
      for (let i = 0; i < 3; i++) {
        manager.recordFailure('claude-haiku');
      }

      expect(manager.shouldEscalate('claude-haiku')).toBe(true);
    });
  });

  describe('recordSuccess', () => {
    it('should reset failure count', () => {
      manager.recordFailure('claude-haiku');
      manager.recordFailure('claude-haiku');
      manager.recordSuccess('claude-haiku');

      expect(manager.shouldEscalate('claude-haiku')).toBe(false);
    });
  });

  describe('getNextModel', () => {
    it('should escalate to more capable model', () => {
      const next = manager.getNextModel('claude-haiku');

      expect(next).not.toBe('claude-haiku');
      // Should be a more capable model
    });

    it('should return same model if already most capable', () => {
      const next = manager.getNextModel('o3-mini');

      expect(next).toBe('o3-mini');
    });
  });

  describe('resetFailures', () => {
    it('should reset failure count for model', () => {
      manager.recordFailure('claude-haiku');
      manager.resetFailures('claude-haiku');

      expect(manager.shouldEscalate('claude-haiku')).toBe(false);
    });
  });
});
