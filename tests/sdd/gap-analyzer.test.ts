// Vibemate SDD — Gap Analysis Tests

import { describe, it, expect } from 'bun:test';
import {
  analyzeGaps,
  prioritizeGaps,
  suggestQuestions,
  GapAnalysis,
} from '../../src/sdd/gap-analyzer';
import { IntentExtraction } from '../../src/sdd/intent-extractor';

const mockExtraction: IntentExtraction = {
  rawInput: 'Build a landing page generator',
  inferredIntent: {
    problem: 'landing page generator',
    audience: 'general users',
    successMetric: 'successful completion',
    constraints: [],
  },
  gaps: [
    'Missing audience: Who is this for?',
    'Missing success metric: How do you know it succeeded?',
    'Missing: Any constraints or requirements?',
  ],
  confidence: 45,
};

describe('Gap Analysis', () => {
  describe('analyzeGaps', () => {
    it('should categorize gaps by type', () => {
      const result = analyzeGaps(mockExtraction);
      expect(result.categorized.audience.length).toBeGreaterThan(0);
    });

    it('should calculate severity score', () => {
      const result = analyzeGaps(mockExtraction);
      expect(result.severity).toBeGreaterThan(0);
      expect(result.severity).toBeLessThanOrEqual(10);
    });

    it('should generate recommendations', () => {
      const result = analyzeGaps(mockExtraction);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('prioritizeGaps', () => {
    it('should sort gaps by severity', () => {
      const gaps = [
        { type: 'timeline' as const, message: 'Missing timeline', severity: 3 },
        { type: 'audience' as const, message: 'Missing audience', severity: 8 },
        { type: 'constraints' as const, message: 'Missing constraints', severity: 5 },
      ];
      const prioritized = prioritizeGaps(gaps);
      expect(prioritized[0].severity).toBeGreaterThanOrEqual(prioritized[1].severity);
    });

    it('should mark critical gaps', () => {
      const gaps = [
        { type: 'audience' as const, message: 'Missing audience', severity: 9 },
      ];
      const prioritized = prioritizeGaps(gaps);
      expect(prioritized[0].critical).toBe(true);
    });
  });

  describe('suggestQuestions', () => {
    it('should suggest questions for audience gap', () => {
      const questions = suggestQuestions('audience');
      expect(questions.length).toBeGreaterThan(0);
      expect(questions[0]).toContain('?');
    });

    it('should suggest questions for success metric gap', () => {
      const questions = suggestQuestions('successMetric');
      expect(questions.length).toBeGreaterThan(0);
    });

    it('should suggest questions for constraints gap', () => {
      const questions = suggestQuestions('constraints');
      expect(questions.length).toBeGreaterThan(0);
    });

    it('should return default questions for unknown type', () => {
      const questions = suggestQuestions('unknown');
      expect(questions.length).toBeGreaterThan(0);
    });
  });
});
