import { describe, it, expect } from 'bun:test';
import {
  calculateAmbiguityScore,
  getAmbiguityLevel,
  type AmbiguityResult,
} from '../../src/discovery/scoring.js';

describe('AmbiguityScoring', () => {
  describe('calculateAmbiguityScore', () => {
    it('returns 0 for empty answers', () => {
      const result = calculateAmbiguityScore([]);
      expect(result.score).toBe(0);
      expect(result.level).toBe('clear');
    });

    it('returns low score for single clear answer', () => {
      const result = calculateAmbiguityScore([
        { questionId: 'q1', value: 'SaaS', confidence: 0.9 },
      ]);
      expect(result.score).toBeLessThan(0.3);
      expect(result.level).toBe('clear');
    });

    it('returns higher score for low confidence answers', () => {
      const result = calculateAmbiguityScore([
        { questionId: 'q1', value: 'SaaS', confidence: 0.3 },
      ]);
      expect(result.score).toBeGreaterThan(0.5);
      expect(result.level).toMatch(/^(moderate|high)$/);
    });

    it('returns higher score for text answers (more ambiguous)', () => {
      const result = calculateAmbiguityScore([
        { questionId: 'q1', value: 'Build something cool', isText: true, confidence: 0.8 },
      ]);
      expect(result.score).toBeGreaterThan(0.25);
    });

    it('averages confidence across multiple answers', () => {
      const result = calculateAmbiguityScore([
        { questionId: 'q1', value: 'yes', confidence: 0.9 },
        { questionId: 'q2', value: 'no', confidence: 0.9 },
      ]);
      expect(result.score).toBeLessThan(0.3);
    });
  });

  describe('getAmbiguityLevel', () => {
    it('returns clear for low scores', () => {
      expect(getAmbiguityLevel(0.1)).toBe('clear');
      expect(getAmbiguityLevel(0.2)).toBe('clear');
    });

    it('returns moderate for medium scores', () => {
      expect(getAmbiguityLevel(0.4)).toBe('moderate');
      expect(getAmbiguityLevel(0.6)).toBe('moderate');
    });

    it('returns high for high scores', () => {
      expect(getAmbiguityLevel(0.7)).toBe('high');
      expect(getAmbiguityLevel(0.9)).toBe('high');
    });
  });
});
