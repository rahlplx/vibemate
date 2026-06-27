// Vibemate SDD — Governance Engine Tests

import { describe, it, expect } from 'bun:test';
import {
  enforceRules,
  checkGovernance,
  logViolation,
  GovernanceResult,
  Violation,
} from '../../src/sdd/governance-engine';
import { RULES, GOVERNANCE_POLICIES } from '../../src/sdd/knowledge-base';

describe('Governance Engine', () => {
  describe('enforceRules', () => {
    it('should enforce intent confidence rule', () => {
      const context = { confidence: 30 };
      const result = enforceRules(context);
      expect(result.violations.some(v => v.ruleId === 'rule-intent-001')).toBe(true);
    });

    it('should pass when confidence is high', () => {
      const context = { confidence: 85 };
      const result = enforceRules(context);
      expect(result.violations.some(v => v.ruleId === 'rule-intent-001')).toBe(false);
    });

    it('should enforce audience requirement', () => {
      const context = { audience: 'general users' };
      const result = enforceRules(context);
      expect(result.violations.some(v => v.ruleId === 'rule-intent-002')).toBe(true);
    });

    it('should enforce quality threshold', () => {
      const context = { qualityScore: 55 };
      const result = enforceRules(context);
      expect(result.violations.some(v => v.ruleId === 'rule-quality-001')).toBe(true);
    });

    it('should enforce intent match threshold', () => {
      const context = { matchScore: 60 };
      const result = enforceRules(context);
      expect(result.violations.some(v => v.ruleId === 'rule-match-001')).toBe(true);
    });

    it('should block on critical violations', () => {
      const context = { problemMatched: false };
      const result = enforceRules(context);
      expect(result.blocked).toBe(true);
    });
  });

  describe('checkGovernance', () => {
    it('should check open source compliance', () => {
      const result = checkGovernance('src/index.ts', 'MIT');
      expect(result.passed).toBe(true);
    });

    it('should detect unlicensed code', () => {
      const result = checkGovernance('src/index.ts', '');
      expect(result.violations.some(v => v.includes('license'))).toBe(true);
    });

    it('should check security baseline', () => {
      const result = checkGovernance('src/api.ts', 'MIT');
      expect(result.securityChecks.length).toBeGreaterThan(0);
    });
  });

  describe('logViolation', () => {
    it('should log violation with timestamp', () => {
      const violation: Violation = {
        ruleId: 'rule-intent-001',
        severity: 'warning',
        message: 'Low confidence',
        timestamp: Date.now(),
      };
      const logged = logViolation(violation);
      expect(logged.timestamp).toBeGreaterThan(0);
    });
  });
});
