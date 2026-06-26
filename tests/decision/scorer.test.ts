import { describe, it, expect } from 'vitest';
import {
  calculateScore,
  rankOptions,
  type ScoringInput,
} from '../../src/decision/scorer.js';

describe('DecisionScorer', () => {
  describe('calculateScore', () => {
    it('returns 0 for empty criteria', () => {
      const score = calculateScore({ performance: 0.9 }, []);
      expect(score).toBe(0);
    });

    it('calculates weighted average', () => {
      const score = calculateScore(
        { perf: 0.8, cost: 0.6 },
        [
          { id: 'perf', weight: 0.7 },
          { id: 'cost', weight: 0.3 },
        ]
      );
      expect(score).toBeCloseTo(0.74);
    });

    it('handles missing scores as 0', () => {
      const score = calculateScore(
        { perf: 0.9 },
        [
          { id: 'perf', weight: 0.5 },
          { id: 'cost', weight: 0.5 },
        ]
      );
      expect(score).toBeCloseTo(0.45);
    });
  });

  describe('rankOptions', () => {
    it('returns options sorted by score', () => {
      const ranked = rankOptions(
        [
          { id: 'a', scores: { perf: 0.6 } },
          { id: 'b', scores: { perf: 0.9 } },
          { id: 'c', scores: { perf: 0.7 } },
        ],
        [{ id: 'perf', weight: 1.0 }]
      );
      expect(ranked[0].id).toBe('b');
      expect(ranked[1].id).toBe('c');
      expect(ranked[2].id).toBe('a');
    });

    it('handles multiple criteria', () => {
      const ranked = rankOptions(
        [
          { id: 'a', scores: { perf: 0.9, cost: 0.3 } },
          { id: 'b', scores: { perf: 0.5, cost: 0.9 } },
        ],
        [
          { id: 'perf', weight: 0.5 },
          { id: 'cost', weight: 0.5 },
        ]
      );
      expect(ranked[0].id).toBe('b');
    });
  });
});
