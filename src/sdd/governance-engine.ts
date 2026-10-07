// Vibemate SDD — Governance Engine

import type { Rule } from './knowledge-base';

export interface Violation {
  ruleId: string;
  severity: Rule['severity'];
  message: string;
  timestamp: number;
  context?: string;
}

export interface GovernanceResult {
  passed: boolean;
  blocked: boolean;
  violations: Violation[];
  warnings: Violation[];
  errors: Violation[];
  criticals: Violation[];
}

export function enforceRules(context: Record<string, unknown>): GovernanceResult {
  const violations: Violation[] = [];
  const warnings: Violation[] = [];
  const errors: Violation[] = [];
  const criticals: Violation[] = [];
  
  // Optimization: Single-pass rule evaluation categorizes violations into severity buckets directly,
  // avoiding triple Array.prototype.filter() passes over the violations list.
  const timestamp = Date.now();

  // Rule: Intent Confidence Threshold
  if (typeof context.confidence === 'number' && context.confidence < 50) {
    const v: Violation = {
      ruleId: 'rule-intent-001',
      severity: 'warning',
      message: `Intent confidence ${context.confidence}% is below 50% threshold`,
      timestamp,
    };
    violations.push(v);
    warnings.push(v);
  }
  
  // Rule: Audience Required
  if (context.audience === 'general users') {
    const v: Violation = {
      ruleId: 'rule-intent-002',
      severity: 'error',
      message: 'Audience is generic "general users" — must define specific audience',
      timestamp,
    };
    violations.push(v);
    errors.push(v);
  }
  
  // Rule: Success Metric Required
  if (context.successMetric === 'successful completion') {
    const v: Violation = {
      ruleId: 'rule-intent-003',
      severity: 'error',
      message: 'Success metric is generic — must define measurable criteria',
      timestamp,
    };
    violations.push(v);
    errors.push(v);
  }
  
  // Rule: Quality Threshold
  if (typeof context.qualityScore === 'number' && context.qualityScore < 70) {
    const v: Violation = {
      ruleId: 'rule-quality-001',
      severity: 'warning',
      message: `Quality score ${context.qualityScore} is below 70 threshold`,
      timestamp,
    };
    violations.push(v);
    warnings.push(v);
  }
  
  // Rule: Readability Floor
  if (typeof context.readability === 'number' && context.readability < 60) {
    const v: Violation = {
      ruleId: 'rule-quality-002',
      severity: 'error',
      message: `Readability ${context.readability} is below 60 floor`,
      timestamp,
    };
    violations.push(v);
    errors.push(v);
  }
  
  // Rule: Intent Match Threshold
  if (typeof context.matchScore === 'number' && context.matchScore < 70) {
    const v: Violation = {
      ruleId: 'rule-match-001',
      severity: 'warning',
      message: `Intent match ${context.matchScore}% is below 70% threshold`,
      timestamp,
    };
    violations.push(v);
    warnings.push(v);
  }
  
  // Rule: Core Element Match
  if (context.problemMatched === false || context.audienceMatched === false) {
    const v: Violation = {
      ruleId: 'rule-match-002',
      severity: 'critical',
      message: 'Core elements (problem/audience) not matched — cannot ship',
      timestamp,
    };
    violations.push(v);
    criticals.push(v);
  }
  
  // Rule: Circuit Breaker
  if (typeof context.consecutiveFailures === 'number' && context.consecutiveFailures >= 3) {
    const v: Violation = {
      ruleId: 'rule-pipeline-002',
      severity: 'critical',
      message: `${context.consecutiveFailures} consecutive failures — circuit breaker triggered`,
      timestamp,
    };
    violations.push(v);
    criticals.push(v);
  }
  
  const blocked = criticals.length > 0 || errors.length > 0;
  const passed = violations.length === 0;
  
  return {
    passed,
    blocked,
    violations,
    warnings,
    errors,
    criticals,
  };
}

export interface GovernanceCheckResult {
  passed: boolean;
  violations: string[];
  securityChecks: string[];
}

export function checkGovernance(filePath: string, license: string): GovernanceCheckResult {
  const violations: string[] = [];
  const securityChecks: string[] = [];
  
  // Check license
  if (!license || license.trim().length === 0) {
    violations.push('Missing license — all source files must have OSI-approved license');
  }
  
  // Check file path patterns
  if (filePath.includes('secret') || filePath.includes('credential') || filePath.includes('password')) {
    violations.push('Suspicious file path — may contain secrets');
  }
  
  // Security checks
  securityChecks.push('Input validation required for external data');
  securityChecks.push('Rate limiting required for API endpoints');
  securityChecks.push('CORS configuration required');
  
  return {
    passed: violations.length === 0,
    violations,
    securityChecks,
  };
}

export function logViolation(violation: Violation): Violation {
  return {
    ...violation,
    timestamp: violation.timestamp || Date.now(),
  };
}
