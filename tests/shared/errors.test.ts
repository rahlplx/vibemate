import { describe, it, expect } from 'vitest';
import {
  VibemateError,
  DiscoveryError,
  ScaffoldError,
  DecisionError,
  StateError,
  ExecutionError,
  type ErrorCode,
} from '../../src/shared/errors.js';

describe('VibemateError', () => {
  it('creates error with code and message', () => {
    const err = new VibemateError('TEST_ERROR', 'something failed');
    expect(err.code).toBe('TEST_ERROR');
    expect(err.message).toBe('something failed');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(VibemateError);
  });

  it('preserves cause chain', () => {
    const cause = new Error('root cause');
    const err = new VibemateError('TEST_ERROR', 'wrapped', { cause });
    expect(err.cause).toBe(cause);
  });

  it('preserves context metadata', () => {
    const err = new VibemateError('TEST_ERROR', 'failed', {
      context: { userId: '123', attempt: 3 },
    });
    expect(err.context).toEqual({ userId: '123', attempt: 3 });
  });

  it('has correct name', () => {
    const err = new VibemateError('TEST_ERROR', 'msg');
    expect(err.name).toBe('VibemateError');
  });
});

describe('DiscoveryError', () => {
  it('creates error with DISCOVERY_ prefix', () => {
    const err = new DiscoveryError('TREE_EXHAUSTED', 'no more questions');
    expect(err.code).toBe('DISCOVERY_TREE_EXHAUSTED');
    expect(err).toBeInstanceOf(VibemateError);
  });

  it('has correct name', () => {
    const err = new DiscoveryError('MAX_CYCLES', 'exceeded');
    expect(err.name).toBe('DiscoveryError');
  });
});

describe('ScaffoldError', () => {
  it('creates error with SCAFFOLD_ prefix', () => {
    const err = new ScaffoldError('TEMPLATE_INVALID', 'bad template');
    expect(err.code).toBe('SCAFFOLD_TEMPLATE_INVALID');
    expect(err).toBeInstanceOf(VibemateError);
  });

  it('has correct name', () => {
    const err = new ScaffoldError('FILE_WRITE_FAILED', 'disk full');
    expect(err.name).toBe('ScaffoldError');
  });
});

describe('DecisionError', () => {
  it('creates error with DECISION_ prefix', () => {
    const err = new DecisionError('INVALID_WEIGHTS', 'sum != 1.0');
    expect(err.code).toBe('DECISION_INVALID_WEIGHTS');
    expect(err).toBeInstanceOf(VibemateError);
  });

  it('has correct name', () => {
    const err = new DecisionError('MATRIX_EMPTY', 'no options');
    expect(err.name).toBe('DecisionError');
  });
});

describe('StateError', () => {
  it('creates error with STATE_ prefix', () => {
    const err = new StateError('SYNC_CONFLICT', 'conflict detected');
    expect(err.code).toBe('STATE_SYNC_CONFLICT');
    expect(err).toBeInstanceOf(VibemateError);
  });
});

describe('ExecutionError', () => {
  it('creates error with EXECUTION_ prefix', () => {
    const err = new ExecutionError('GATE_DENIED', 'complexity too high');
    expect(err.code).toBe('EXECUTION_GATE_DENIED');
    expect(err).toBeInstanceOf(VibemateError);
  });
});

describe('ErrorCode type', () => {
  it('all error classes accept valid codes', () => {
    const codes: ErrorCode[] = [
      'DISCOVERY_MAX_CYCLES',
      'DISCOVERY_TREE_EXHAUSTED',
      'SCAFFOLD_TEMPLATE_INVALID',
      'SCAFFOLD_FILE_WRITE_FAILED',
      'DECISION_INVALID_WEIGHTS',
      'DECISION_MATRIX_EMPTY',
      'STATE_SYNC_CONFLICT',
      'STATE_MIGRATION_FAILED',
      'EXECUTION_GATE_DENIED',
      'EXECUTION_COMPLEXITY_EXCEEDED',
    ];
    expect(codes.length).toBe(10);
  });
});
