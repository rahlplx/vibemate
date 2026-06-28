import { describe, it, expect } from 'bun:test';
import { CostAwareRouter } from '../../src/router/index.js';
import { ObservationEngine } from '../../src/improve/observation.js';
import { Observation } from '../../src/state/store.js';

function makeObs(type: string, confidence: number): Observation {
  return {
    id: crypto.randomUUID(),
    session_id: 'test',
    type,
    description: `test ${type}`,
    lesson: '',
    tags: '',
    confidence,
    created_at: new Date().toISOString()
  };
}

function makeObsEngine(observations: Observation[]): ObservationEngine {
  return {
    record: async () => {},
    getInsights: (minConfidence = 0.9) => observations.filter(o => o.confidence >= minConfidence),
    getSummary: async () => ({ total: observations.length, byType: {}, averageConfidence: 0 })
  } as unknown as ObservationEngine;
}

const lowCriteria = {
  filesImplicated: 0,
  requiresReasoning: false,
  testOutputSize: 0,
  hasDependencies: false,
  isRefactoring: false,
  requiresSecurity: false
};

describe('ObservationEngine feeds CostAwareRouter', () => {
  it('does not escalate when fewer than 3 high-confidence failures', () => {
    const obs = [makeObs('failure', 0.95), makeObs('failure', 0.92)]; // only 2 failures
    const engine = makeObsEngine(obs);
    const router = new CostAwareRouter([], 100, undefined, engine);

    const decision = router.route(lowCriteria);
    // Low complexity without escalation → cheap basic model, level stays 'low'
    expect(decision.level).toBe('low');
  });

  it('escalates from low to medium when 3+ high-confidence failures observed', () => {
    const obs = [
      makeObs('failure', 0.95),
      makeObs('failure', 0.91),
      makeObs('failure', 0.93),
    ];
    const engine = makeObsEngine(obs);
    const router = new CostAwareRouter([], 100, undefined, engine);

    const decision = router.route(lowCriteria);
    expect(decision.level).toBe('medium');
  });

  it('does not escalate when failures are below minConfidence threshold', () => {
    const obs = [
      makeObs('failure', 0.5), // below 0.9 threshold
      makeObs('failure', 0.7),
      makeObs('failure', 0.8),
    ];
    const engine = makeObsEngine(obs);
    const router = new CostAwareRouter([], 100, undefined, engine);

    const decision = router.route(lowCriteria);
    expect(decision.level).toBe('low');
  });

  it('does not escalate when high-confidence observations are successes not failures', () => {
    const obs = [
      makeObs('success', 0.95),
      makeObs('success', 0.92),
      makeObs('success', 0.98),
    ];
    const engine = makeObsEngine(obs);
    const router = new CostAwareRouter([], 100, undefined, engine);

    const decision = router.route(lowCriteria);
    expect(decision.level).toBe('low');
  });
});
