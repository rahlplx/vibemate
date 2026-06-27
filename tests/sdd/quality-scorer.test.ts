// Vibemate SDD — Quality Scoring Tests

import { describe, it, expect } from 'bun:test';
import {
  scoreReadability,
  scoreUniqueness,
  scorePersuasiveness,
  scoreProfessionalism,
  calculateOverallQuality,
  QualityReport,
} from '../../src/sdd/quality-scorer';

describe('Quality Scoring', () => {
  describe('scoreReadability', () => {
    it('should score simple text highly', () => {
      const score = scoreReadability('Build a landing page for founders');
      expect(score).toBeGreaterThan(70);
    });

    it('should penalize complex text', () => {
      const score = scoreReadability('Utilize sophisticated algorithmic paradigms to orchestrate infrastructure');
      expect(score).toBeLessThan(80);
    });

    it('should handle empty text', () => {
      const score = scoreReadability('');
      expect(score).toBe(0);
    });
  });

  describe('scoreUniqueness', () => {
    it('should score unique descriptions highly', () => {
      const score = scoreUniqueness('AI-powered micro-SaaS validator for indie hackers');
      expect(score).toBeGreaterThan(70);
    });

    it('should penalize generic descriptions', () => {
      const score = scoreUniqueness('Build a website');
      expect(score).toBeLessThan(70);
    });
  });

  describe('scorePersuasiveness', () => {
    it('should score CTA-focused descriptions highly', () => {
      const score = scorePersuasiveness('Deploy in 5 minutes, no credit card required');
      expect(score).toBeGreaterThan(70);
    });

    it('should penalize vague descriptions', () => {
      const score = scorePersuasiveness('Make something');
      expect(score).toBeLessThanOrEqual(40);
    });
  });

  describe('scoreProfessionalism', () => {
    it('should score professional descriptions highly', () => {
      const score = scoreProfessionalism('Enterprise-grade API with 99.9% uptime SLA');
      expect(score).toBeGreaterThan(70);
    });

    it('should penalize informal descriptions', () => {
      const score = scoreProfessionalism('idk just make it work lol');
      expect(score).toBeLessThanOrEqual(40);
    });
  });

  describe('calculateOverallQuality', () => {
    it('should calculate weighted average', () => {
      const report = calculateOverallQuality('Build a landing page for non-technical founders that deploys to Vercel in 5 minutes');
      expect(report.overall).toBeGreaterThan(0);
      expect(report.overall).toBeLessThanOrEqual(100);
    });

    it('should include all sub-scores', () => {
      const report = calculateOverallQuality('Build a landing page');
      expect(report.readability).toBeDefined();
      expect(report.uniqueness).toBeDefined();
      expect(report.persuasiveness).toBeDefined();
      expect(report.professionalism).toBeDefined();
    });

    it('should provide improvement suggestions', () => {
      const report = calculateOverallQuality('Build a website');
      expect(report.suggestions.length).toBeGreaterThan(0);
    });
  });
});
