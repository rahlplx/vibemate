// Vibemate SDD — Governance Engine

import { Rule, GOVERNANCE_POLICIES, RULES } from './knowledge-base';

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
  
  // Rule: Intent Confidence Threshold
  if (typeof context.confidence === 'number' && context.confidence < 50) {
    violations.push({
      ruleId: 'rule-intent-001',
      severity: 'warning',
      message: `Intent confidence ${context.confidence}% is below 50% threshold`,
      timestamp: Date.now(),
    });
  }
  
  // Rule: Audience Required
  if (context.audience === 'general users') {
    violations.push({
      ruleId: 'rule-intent-002',
      severity: 'error',
      message: 'Audience is generic "general users" — must define specific audience',
      timestamp: Date.now(),
    });
  }
  
  // Rule: Success Metric Required
  if (context.successMetric === 'successful completion') {
    violations.push({
      ruleId: 'rule-intent-003',
      severity: 'error',
      message: 'Success metric is generic — must define measurable criteria',
      timestamp: Date.now(),
    });
  }
  
  // Rule: Quality Threshold
  if (typeof context.qualityScore === 'number' && context.qualityScore < 70) {
    violations.push({
      ruleId: 'rule-quality-001',
      severity: 'warning',
      message: `Quality score ${context.qualityScore} is below 70 threshold`,
      timestamp: Date.now(),
    });
  }
  
  // Rule: Readability Floor
  if (typeof context.readability === 'number' && context.readability < 60) {
    violations.push({
      ruleId: 'rule-quality-002',
      severity: 'error',
      message: `Readability ${context.readability} is below 60 floor`,
      timestamp: Date.now(),
    });
  }
  
  // Rule: Intent Match Threshold
  if (typeof context.matchScore === 'number' && context.matchScore < 70) {
    violations.push({
      ruleId: 'rule-match-001',
      severity: 'warning',
      message: `Intent match ${context.matchScore}% is below 70% threshold`,
      timestamp: Date.now(),
    });
  }
  
  // Rule: Core Element Match
  if (context.problemMatched === false || context.audienceMatched === false) {
    violations.push({
      ruleId: 'rule-match-002',
      severity: 'critical',
      message: 'Core elements (problem/audience) not matched — cannot ship',
      timestamp: Date.now(),
    });
  }
  
  // Rule: Circuit Breaker
  if (typeof context.consecutiveFailures === 'number' && context.consecutiveFailures >= 3) {
    violations.push({
      ruleId: 'rule-pipeline-002',
      severity: 'critical',
      message: `${context.consecutiveFailures} consecutive failures — circuit breaker triggered`,
      timestamp: Date.now(),
    });
  }
  
  // Categorize violations
  const warnings = violations.filter(v => v.severity === 'warning');
  const errors = violations.filter(v => v.severity === 'error');
  const criticals = violations.filter(v => v.severity === 'critical');
  
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
