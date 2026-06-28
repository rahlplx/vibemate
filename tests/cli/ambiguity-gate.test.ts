import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// We test the AmbiguityGate logic by directly importing and calling the exported
// helpers rather than spinning up the full CLI pipeline.
import { applyAmbiguityGate } from '../../src/cli/auto-helpers.js';
import { CircuitBreaker } from '../../src/types.js';

let testDir: string;

beforeEach(async () => {
  testDir = join(tmpdir(), `ambiguity-gate-${crypto.randomUUID()}`);
  await mkdir(testDir, { recursive: true });
});

afterEach(async () => {
  await rm(testDir, { recursive: true, force: true });
});

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

describe('AmbiguityGate', () => {
  it('does not increment consecutiveFailures for clear ambiguity', () => {
    const cb = makeBreaker();
    applyAmbiguityGate({ score: 0.1, level: 'clear', factors: [] }, cb);
    expect(cb.consecutiveFailures).toBe(0);
  });

  it('does not increment consecutiveFailures for moderate ambiguity', () => {
    const cb = makeBreaker();
    applyAmbiguityGate({ score: 0.5, level: 'moderate', factors: ['free text'] }, cb);
    expect(cb.consecutiveFailures).toBe(0);
  });

  it('increments consecutiveFailures by 1 for high ambiguity (soft gate)', () => {
    const cb = makeBreaker();
    applyAmbiguityGate({ score: 0.85, level: 'high', factors: ['unclear scope', 'missing context'] }, cb);
    expect(cb.consecutiveFailures).toBe(1);
  });

  it('applies gate only for level=high regardless of score', () => {
    const cb = makeBreaker();
    // Technically 'high' starts at score >= 0.7
    applyAmbiguityGate({ score: 0.7, level: 'high', factors: ['low confidence'] }, cb);
    expect(cb.consecutiveFailures).toBe(1);
  });
});
