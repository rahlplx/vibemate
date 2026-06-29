import { describe, it, expect } from 'bun:test';
import { handleHarnessFailure, trackPhaseCost } from '../../src/cli/auto-helpers.js';
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

describe('trackPhaseCost', () => {
  it('adds estimated cost to circuitBreaker.totalCost', () => {
    const cb = makeBreaker();
    const router = { recordCost: (_n: number) => {} };
    trackPhaseCost(cb, router, 0.05);
    expect(cb.totalCost).toBeCloseTo(0.05);
  });

  it('calls router.recordCost with the estimated cost', () => {
    const cb = makeBreaker();
    let recorded = 0;
    const router = { recordCost: (n: number) => { recorded += n; } };
    trackPhaseCost(cb, router, 0.03);
    expect(recorded).toBeCloseTo(0.03);
  });

  it('accumulates cost across multiple phases', () => {
    const cb = makeBreaker();
    let recorded = 0;
    const router = { recordCost: (n: number) => { recorded += n; } };
    trackPhaseCost(cb, router, 0.01);
    trackPhaseCost(cb, router, 0.02);
    expect(cb.totalCost).toBeCloseTo(0.03);
    expect(recorded).toBeCloseTo(0.03);
  });

  it('does not update totalCost when estimatedCost is zero', () => {
    const cb = makeBreaker();
    const router = { recordCost: (_n: number) => {} };
    trackPhaseCost(cb, router, 0);
    expect(cb.totalCost).toBe(0);
  });
});

import { classifyTasksWithGate } from '../../src/cli/auto-helpers.js';
import type { LLMTask } from '../../src/cli/phase-helpers.js';

function makeTask(overrides: Partial<LLMTask> = {}): LLMTask {
  return {
    id: 'task-1',
    title: 'Test task',
    description: 'A simple task',
    milestone: 'M1',
    complexityScore: 3,
    executionMode: 'inline',
    acceptanceCriteria: [],
    dependencies: [],
    files: [],
    ...overrides,
  };
}

describe('classifyTasksWithGate', () => {
  it('preserves inline for a simple task', () => {
    const tasks = [makeTask({ description: 'Add a button', files: [] })];
    const result = classifyTasksWithGate(tasks, false);
    expect(result[0].executionMode).toBe('inline');
  });

  it('overrides LLM inline with session for a complex task', () => {
    const tasks = [makeTask({
      description: 'Refactor auth system',
      files: Array(10).fill('src/auth.ts'),
      executionMode: 'inline',
    })];
    const result = classifyTasksWithGate(tasks, true);
    expect(result[0].executionMode).not.toBe('inline');
  });

  it('returns a new array without mutating the input', () => {
    const tasks = [makeTask()];
    const result = classifyTasksWithGate(tasks, false);
    expect(result).not.toBe(tasks);
  });

  it('sets gatedMode on each task', () => {
    const tasks = [makeTask()];
    const result = classifyTasksWithGate(tasks, false);
    expect((result[0] as LLMTask & { gatedMode: string }).gatedMode).toBeDefined();
  });

  it('processes multiple tasks independently', () => {
    const tasks = [
      makeTask({ description: 'Simple button', files: [] }),
      makeTask({ id: 'task-2', description: 'Migrate auth', files: Array(12).fill('x'), executionMode: 'inline' }),
    ];
    const result = classifyTasksWithGate(tasks, false);
    expect(result).toHaveLength(2);
  });
});
