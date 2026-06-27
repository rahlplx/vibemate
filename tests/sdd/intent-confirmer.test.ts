// Vibemate SDD — Intent Confirmation Tests

import { describe, it, expect } from 'bun:test';
import {
  confirmIntent,
  formatConfirmation,
  updateFromFeedback,
  ConfirmationResult,
} from '../../src/sdd/intent-confirmer';
import { IntentExtraction } from '../../src/sdd/intent-extractor';

const mockExtraction: IntentExtraction = {
  rawInput: 'Build a landing page generator for non-technical founders',
  inferredIntent: {
    problem: 'landing page generator',
    audience: 'non-technical founders',
    successMetric: 'successful completion',
    constraints: [],
  },
  gaps: ['Missing success metric: How do you know it succeeded?'],
  confidence: 75,
};

describe('Intent Confirmation', () => {
  describe('confirmIntent', () => {
    it('should return extraction with confirmed=false when not confirmed', () => {
      const result = confirmIntent(mockExtraction, false, '');
      expect(result.confirmed).toBe(false);
    });

    it('should return extraction with confirmed=true when confirmed', () => {
      const result = confirmIntent(mockExtraction, true, '');
      expect(result.confirmed).toBe(true);
    });

    it('should apply user corrections when provided', () => {
      const result = confirmIntent(mockExtraction, true, 'Must deploy to Vercel');
      expect(result.correctedIntent.constraints).toContain('Must deploy to Vercel');
    });

    it('should update confidence based on confirmation', () => {
      const result = confirmIntent(mockExtraction, true, '');
      expect(result.confidence).toBeGreaterThanOrEqual(75);
    });
  });

  describe('formatConfirmation', () => {
    it('should format intent for display', () => {
      const formatted = formatConfirmation(mockExtraction);
      expect(formatted).toContain('landing page generator');
      expect(formatted).toContain('non-technical founders');
    });

    it('should include confidence score', () => {
      const formatted = formatConfirmation(mockExtraction);
      expect(formatted).toContain('75');
    });

    it('should include gaps if any', () => {
      const formatted = formatConfirmation(mockExtraction);
      expect(formatted).toContain('success metric');
    });
  });

  describe('updateFromFeedback', () => {
    it('should update problem from feedback', () => {
      const result = updateFromFeedback(mockExtraction, 'Actually, I want a landing page BUILDER');
      expect(result.rawInput).toContain('BUILDER');
    });

    it('should update audience from feedback', () => {
      const result = updateFromFeedback(mockExtraction, 'Actually, for solo founders');
      expect(result.inferredIntent.audience).toContain('solo founders');
    });

    it('should recalculate confidence after feedback', () => {
      const result = updateFromFeedback(mockExtraction, 'Deploy to Vercel in 2 minutes');
      expect(result.confidence).toBeGreaterThan(75);
    });
  });
});
