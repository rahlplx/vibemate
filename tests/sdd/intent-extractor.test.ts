// Vibemate SDD — Intent Extraction Tests

import { describe, it, expect } from 'bun:test';
import {
  extractIntent,
  calculateConfidence,
  identifyGaps,
  IntentExtraction,
} from '../../src/sdd/intent-extractor';

describe('Intent Extraction', () => {
  describe('extractIntent', () => {
    it('should extract problem from description', () => {
      const result = extractIntent('I want to build a landing page generator for non-technical founders');
      expect(result.inferredIntent.problem).toContain('landing page generator');
    });

    it('should extract audience from description', () => {
      const result = extractIntent('I want to build a tool for small business owners');
      expect(result.inferredIntent.audience).toContain('small business owners');
    });

    it('should extract success metric from description', () => {
      const result = extractIntent('I want to deploy a working page in under 5 minutes');
      expect(result.inferredIntent.successMetric).toContain('5 minutes');
    });

    it('should extract constraints from description', () => {
      const result = extractIntent('No backend, static HTML only, must work on mobile');
      expect(result.inferredIntent.constraints).toContain('no backend');
    });

    it('should handle vague descriptions', () => {
      const result = extractIntent('Build me something cool');
      expect(result.confidence).toBeLessThan(50);
      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it('should handle detailed descriptions', () => {
      const result = extractIntent(
        'I want to build a landing page generator for non-technical founders. ' +
        'It should take a business description and generate a beautiful HTML page. ' +
        'The page should deploy to Vercel in under 5 minutes. ' +
        'No backend needed, static HTML only.'
      );
      expect(result.confidence).toBeGreaterThan(80);
    });
  });

  describe('calculateConfidence', () => {
    it('should return low confidence for empty input', () => {
      const confidence = calculateConfidence('');
      expect(confidence).toBeLessThan(20);
    });

    it('should return medium confidence for partial input', () => {
      const confidence = calculateConfidence('Build a landing page');
      expect(confidence).toBeGreaterThan(20);
      expect(confidence).toBeLessThan(70);
    });

    it('should return high confidence for complete input', () => {
      const confidence = calculateConfidence(
        'Build a landing page generator for non-technical founders that deploys to Vercel in 5 minutes'
      );
      expect(confidence).toBeGreaterThan(80);
    });
  });

  describe('identifyGaps', () => {
    it('should identify missing audience', () => {
      const gaps = identifyGaps('Build a landing page generator');
      expect(gaps.some(g => g.toLowerCase().includes('audience'))).toBe(true);
    });

    it('should identify missing success metric', () => {
      const gaps = identifyGaps('Build a landing page generator for founders');
      expect(gaps.some(g => g.toLowerCase().includes('success'))).toBe(true);
    });

    it('should identify missing constraints', () => {
      const gaps = identifyGaps('Build a landing page generator for founders that works');
      expect(gaps.some(g => g.toLowerCase().includes('constraint'))).toBe(true);
    });

    it('should return empty array for complete input', () => {
      const gaps = identifyGaps(
        'Build a landing page generator for non-technical founders that deploys to Vercel in 5 minutes with no backend'
      );
      expect(gaps.length).toBe(0);
    });
  });
});
