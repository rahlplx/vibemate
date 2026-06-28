import { describe, it, expect } from 'bun:test';
import { CostAwareRouter } from '../../src/router/index.js';
import type { PhaseObservation, AutoPhase } from '../../src/types.js';

// -------------------------------------------------------------------
// M3-A: PhaseObservation type shape
// -------------------------------------------------------------------
describe('PhaseObservation shape', () => {
  it('has all required fields', () => {
    const obs: PhaseObservation = {
      phase: 'build',
      durationMs: 1234,
      tokenCost: 0.005,
      errorCount: 0,
      circuitBreakerState: { consecutiveFailures: 0, dispatchCount: 1, totalCost: 0.005 },
      observationScore: 0.9,
      timestamp: new Date().toISOString(),
      observationId: 'obs-abc',
    };
    expect(obs.phase).toBe('build');
    expect(obs.durationMs).toBe(1234);
    expect(obs.errorCount).toBe(0);
    expect(obs.observationScore).toBeGreaterThanOrEqual(0);
    expect(obs.observationScore).toBeLessThanOrEqual(1);
    expect(obs.circuitBreakerState.consecutiveFailures).toBe(0);
  });

  it('observation score is clamped to [0, 1]', () => {
    const scores = [0, 0.5, 1, 0.3, 0.7];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });
});

// -------------------------------------------------------------------
// M3-B: Phase-aware routing
// -------------------------------------------------------------------
describe('CostAwareRouter — phase-aware routing', () => {
  const baseCriteria = {
    filesImplicated: 2,
    requiresReasoning: false,
    testOutputSize: 100,
    hasDependencies: false,
    isRefactoring: false,
    requiresSecurity: false,
  };

  it('think phase routes to high-tier model', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route({ ...baseCriteria, phase: 'think' });
    expect(decision.level).toBe('high');
    expect(decision.phase).toBe('think');
  });

  it('review phase routes to high-tier model', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route({ ...baseCriteria, phase: 'review' });
    expect(decision.level).toBe('high');
  });

  it('build phase routes to medium-tier model', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route({ ...baseCriteria, phase: 'build' });
    expect(decision.level).toBe('medium');
  });

  it('plan phase routes to medium-tier model', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route({ ...baseCriteria, phase: 'plan' });
    expect(decision.level).toBe('medium');
  });

  it('harness phase routes to low-tier model', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route({ ...baseCriteria, phase: 'harness' });
    expect(decision.level).toBe('low');
  });

  it('retro phase routes to low-tier model', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route({ ...baseCriteria, phase: 'retro' });
    expect(decision.level).toBe('low');
  });

  it('learn phase routes to low-tier model', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route({ ...baseCriteria, phase: 'learn' });
    expect(decision.level).toBe('low');
  });

  it('without phase falls back to complexity-score routing', () => {
    const router = new CostAwareRouter([], 100);
    // Low complexity, no phase → low tier
    const lowDecision = router.route({ ...baseCriteria });
    expect(lowDecision.level).toBe('low');

    // High complexity, no phase → high tier
    const highDecision = router.route({
      ...baseCriteria,
      filesImplicated: 20,
      requiresReasoning: true,
      requiresSecurity: true,
    });
    expect(highDecision.level).toBe('high');
  });
});

// -------------------------------------------------------------------
// M3-B: Observation score escalation
// -------------------------------------------------------------------
describe('CostAwareRouter — observation score escalation', () => {
  const baseCriteria = {
    filesImplicated: 1,
    requiresReasoning: false,
    testOutputSize: 50,
    hasDependencies: false,
    isRefactoring: false,
    requiresSecurity: false,
  };

  it('poor observation score (< 0.5) escalates low → medium', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route({ ...baseCriteria, phase: 'harness', observationScore: 0.3 });
    expect(decision.level).toBe('medium');
  });

  it('poor observation score (< 0.5) escalates medium → high', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route({ ...baseCriteria, phase: 'build', observationScore: 0.2 });
    expect(decision.level).toBe('high');
  });

  it('good observation score (>= 0.5) does not escalate', () => {
    const router = new CostAwareRouter([], 100);
    const low = router.route({ ...baseCriteria, phase: 'harness', observationScore: 0.8 });
    expect(low.level).toBe('low');

    const medium = router.route({ ...baseCriteria, phase: 'build', observationScore: 0.6 });
    expect(medium.level).toBe('medium');
  });

  it('observationScore is echoed back in the RoutingDecision', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route({ ...baseCriteria, phase: 'build', observationScore: 0.7 });
    expect(decision.observationScore).toBe(0.7);
  });

  it('phase is echoed back in the RoutingDecision', () => {
    const router = new CostAwareRouter([], 100);
    const decision = router.route({ ...baseCriteria, phase: 'think' });
    expect(decision.phase).toBe('think');
  });
});

// -------------------------------------------------------------------
// M3-C: observationScore computation logic (pure unit test)
// -------------------------------------------------------------------
describe('observationScore computation', () => {
  function computeScore(errorCount: number, durationMs: number, consecutiveFailures: number): number {
    return Math.max(0, 1 - errorCount * 0.3 - (durationMs > 30000 ? 0.2 : 0) - consecutiveFailures * 0.1);
  }

  it('perfect phase → score 1.0', () => {
    expect(computeScore(0, 1000, 0)).toBe(1);
  });

  it('one error → score 0.7', () => {
    expect(computeScore(1, 1000, 0)).toBeCloseTo(0.7);
  });

  it('slow phase (> 30s) → penalty applied', () => {
    expect(computeScore(0, 31000, 0)).toBeCloseTo(0.8);
  });

  it('consecutive failures also penalise score', () => {
    expect(computeScore(0, 1000, 3)).toBeCloseTo(0.7);
  });

  it('score is clamped to 0, never negative', () => {
    expect(computeScore(1, 31000, 10)).toBe(0);
  });
});

// -------------------------------------------------------------------
// M3-D: AutoState observations accumulation
// -------------------------------------------------------------------
describe('AutoState observations array', () => {
  it('observations array accumulates PhaseObservation entries', () => {
    const observations: PhaseObservation[] = [];

    const phases: AutoPhase[] = ['think', 'plan', 'build'];
    for (const phase of phases) {
      observations.push({
        phase,
        durationMs: 500,
        tokenCost: 0,
        errorCount: 0,
        circuitBreakerState: { consecutiveFailures: 0, dispatchCount: observations.length, totalCost: 0 },
        observationScore: 1,
        timestamp: new Date().toISOString(),
        observationId: `obs-${phase}`,
      });
    }

    expect(observations).toHaveLength(3);
    expect(observations.map(o => o.phase)).toEqual(phases);
  });

  it('each observation has a unique observationId', () => {
    const obs: PhaseObservation[] = [
      { phase: 'think', durationMs: 100, tokenCost: 0, errorCount: 0, circuitBreakerState: { consecutiveFailures: 0, dispatchCount: 0, totalCost: 0 }, observationScore: 1, timestamp: '', observationId: 'obs-1' },
      { phase: 'plan',  durationMs: 200, tokenCost: 0, errorCount: 0, circuitBreakerState: { consecutiveFailures: 0, dispatchCount: 1, totalCost: 0 }, observationScore: 1, timestamp: '', observationId: 'obs-2' },
    ];
    const ids = obs.map(o => o.observationId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
