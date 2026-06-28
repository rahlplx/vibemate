import { describe, it, expect } from 'bun:test';
import { handleHarnessFailure } from '../../src/cli/auto-helpers.js';
import { AutoState, CircuitBreaker } from '../../src/types.js';

function makeState(overrides: Partial<AutoState> = {}): AutoState {
  return {
    phase: 'harness',
    step: '',
    completed: [],
    agent: 'claude-code',
    hasUI: false,
    mode: 'auto',
    telemetry: true,
    artifacts: {},
    ...overrides
  };
}

function makeBreaker(): CircuitBreaker {
  return {
    consecutiveFailures: 0,
    dispatchCount: 0,
    totalCost: 0,
    maxFailures: 3,
    maxDispatches: 10,
    maxBudget: 10
  };
}

describe('HARNESS retry with model downgrade', () => {
  it('sets harnessRetried=true and routerDowngrade=true on first failure (does not count)', () => {
    const state = makeState();
    const cb = makeBreaker();

    const shouldRetry = handleHarnessFailure(state, cb);

    expect(shouldRetry).toBe(true);
    expect(state.harnessRetried).toBe(true);
    expect(state.routerDowngrade).toBe(true);
    expect(cb.consecutiveFailures).toBe(0); // not yet counted
  });

  it('increments consecutiveFailures on second failure and resets retry flags', () => {
    const state = makeState({ harnessRetried: true });
    const cb = makeBreaker();

    const shouldRetry = handleHarnessFailure(state, cb);

    expect(shouldRetry).toBe(false);
    expect(cb.consecutiveFailures).toBe(1);
    expect(state.harnessRetried).toBe(false);
    expect(state.routerDowngrade).toBe(false);
  });

  it('does not retry on third+ failure (already counted)', () => {
    const state = makeState({ harnessRetried: true });
    const cb = { ...makeBreaker(), consecutiveFailures: 2 };

    const shouldRetry = handleHarnessFailure(state, cb);
    expect(shouldRetry).toBe(false);
    expect(cb.consecutiveFailures).toBe(3);
  });
});
