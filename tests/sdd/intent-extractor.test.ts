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

    it('should not flag missing success metric when input has a measurable outcome', () => {
      const gaps = identifyGaps('Build a tool for founders that should reduce bounce rate by 30%');
      expect(gaps.some(g => g.toLowerCase().includes('success'))).toBe(false);
    });

    it('should detect audience from "targeting" pattern', () => {
      const gaps = identifyGaps('Build a marketing tool targeting enterprise teams that deploys to Vercel in 5 minutes with no backend');
      expect(gaps.some(g => g.toLowerCase().includes('audience'))).toBe(false);
    });
  });

  describe('semantic improvements', () => {
    it('extracts problem from "I need X" phrasing', () => {
      const result = extractIntent('I need a SaaS dashboard for enterprise teams');
      expect(result.inferredIntent.problem.toLowerCase()).toContain('saas dashboard');
    });

    it('extracts audience from "targeting X" phrasing', () => {
      const result = extractIntent('Build a marketing tool targeting enterprise teams');
      expect(result.inferredIntent.audience.toLowerCase()).toContain('enterprise teams');
    });

    it('extracts audience from "aimed at X" phrasing', () => {
      const result = extractIntent('Build a CLI tool aimed at senior developers');
      expect(result.inferredIntent.audience.toLowerCase()).toContain('senior developers');
    });

    it('gives positive confidence to "need" verb inputs', () => {
      const confidence = calculateConfidence('I need a fast API gateway');
      expect(confidence).toBeGreaterThan(20);
    });

    it('extracts non-deploy success metric like "reduce X by N%"', () => {
      const result = extractIntent('Build a landing page for founders that should reduce bounce rate by 30%');
      expect(result.inferredIntent.successMetric).toContain('bounce rate');
    });

    it('extracts problem from "we want to automate" phrasing without returning full input', () => {
      const input = 'We want to automate our onboarding flow for new users';
      const result = extractIntent(input);
      // Should extract the specific artifact, not echo the full input
      expect(result.inferredIntent.problem.toLowerCase()).toContain('onboarding');
      expect(result.inferredIntent.problem).not.toBe(input);
    });
  });
});
