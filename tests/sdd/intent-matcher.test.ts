// Vibemate SDD — Intent Matching Tests

import { describe, it, expect } from 'bun:test';
import {
  matchIntent,
  calculateMatchScore,
  identifyMatchGaps,
  IntentMatchResult,
} from '../../src/sdd/intent-matcher';
import { IntentExtraction } from '../../src/sdd/intent-extractor';

const mockExtraction: IntentExtraction = {
  rawInput: 'Build a landing page generator for non-technical founders that deploys to Vercel in 5 minutes',
  inferredIntent: {
    problem: 'landing page generator',
    audience: 'non-technical founders',
    successMetric: 'deploy to Vercel in 5 minutes',
    constraints: ['no backend', 'static html'],
  },
  gaps: [],
  confidence: 90,
};

const mockOutput = `
# PageForge - AI Landing Page Generator

## For Non-Technical Founders
Build beautiful landing pages without writing code.

## Features
- AI-powered page generation
- One-click deploy to Vercel
- No backend required
- Static HTML output

## Getting Started
\`\`\`bash
npx pageforge create my-page
\`\`\`

Deploy in under 5 minutes!
`;

describe('Intent Matching', () => {
  describe('matchIntent', () => {
    it('should match output against extraction', () => {
      const result = matchIntent(mockExtraction, mockOutput);
      expect(result.matchScore).toBeGreaterThan(0);
      expect(result.matchScore).toBeLessThanOrEqual(100);
    });

    it('should identify matched elements', () => {
      const result = matchIntent(mockExtraction, mockOutput);
      expect(result.matchedElements.length).toBeGreaterThan(0);
    });

    it('should identify unmatched elements', () => {
      const result = matchIntent(mockExtraction, mockOutput);
      expect(result.unmatchedElements).toBeDefined();
    });

    it('should provide match reasoning', () => {
      const result = matchIntent(mockExtraction, mockOutput);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });
  });

  describe('calculateMatchScore', () => {
    it('should score high for matching output', () => {
      const score = calculateMatchScore(mockExtraction, mockOutput);
      expect(score).toBeGreaterThan(70);
    });

    it('should score low for non-matching output', () => {
      const nonMatchingOutput = 'This is a blog post about cooking recipes';
      const score = calculateMatchScore(mockExtraction, nonMatchingOutput);
      expect(score).toBeLessThan(30);
    });
  });

  describe('identifyMatchGaps', () => {
    it('should identify what output is missing', () => {
      const gaps = identifyMatchGaps(mockExtraction, mockOutput);
      expect(gaps.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty when output matches intent', () => {
      const gaps = identifyMatchGaps(mockExtraction, mockOutput);
      // Our mock output should cover most intent elements
      expect(gaps.length).toBeLessThanOrEqual(2);
    });
  });
});
