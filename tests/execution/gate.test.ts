import { describe, it, expect } from 'bun:test';
import {
  calculateComplexity,
  determineExecutionMode,
  type ComplexityInput,
  type ExecutionMode,
} from '../../src/execution/gate.js';

describe('ExecutionGate', () => {
  describe('calculateComplexity', () => {
    it('returns low score for simple task', () => {
      const input: ComplexityInput = {
        description: 'Add a button',
        filesChanged: 1,
        linesChanged: 10,
        hasTests: false,
        hasUI: false,
      };
      const score = calculateComplexity(input);
      expect(score).toBeLessThanOrEqual(5);
    });

    it('returns high score for complex task', () => {
      const input: ComplexityInput = {
        description: 'Refactor auth system with OAuth2 and SSO',
        filesChanged: 15,
        linesChanged: 500,
        hasTests: true,
        hasUI: true,
      };
      const score = calculateComplexity(input);
      expect(score).toBeGreaterThanOrEqual(6);
    });

    it('factors in test requirement', () => {
      const withTests = calculateComplexity({
        description: 'Add feature',
        filesChanged: 5,
        linesChanged: 100,
        hasTests: true,
        hasUI: false,
      });
      const withoutTests = calculateComplexity({
        description: 'Add feature',
        filesChanged: 5,
        linesChanged: 100,
        hasTests: false,
        hasUI: false,
      });
      expect(withTests).toBeGreaterThan(withoutTests);
    });
  });

  describe('determineExecutionMode', () => {
    it('returns inline for low complexity', () => {
      const mode = determineExecutionMode(3);
      expect(mode).toBe('inline');
    });

    it('returns session for medium complexity', () => {
      const mode = determineExecutionMode(8);
      expect(mode).toBe('session');
    });

    it('returns subagent for high complexity', () => {
      const mode = determineExecutionMode(16);
      expect(mode).toBe('subagent');
    });

    it('returns inline for score 5 or below', () => {
      expect(determineExecutionMode(5)).toBe('inline');
    });

    it('returns session for score 6-15', () => {
      expect(determineExecutionMode(6)).toBe('session');
      expect(determineExecutionMode(15)).toBe('session');
    });

    it('returns subagent for score above 15', () => {
      expect(determineExecutionMode(16)).toBe('subagent');
    });
  });
});
