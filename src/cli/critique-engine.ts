/**
 * CRITIQUE phase engine — adversarial cold-start analysis of generated code.
 *
 * Five structured lenses run in isolation. Each lens can only see the code
 * through its specific adversarial frame, preventing generation-mode bias.
 * A minimum-findings floor ensures the agent never declares "all clear"
 * without genuine investigation (enforces calibrated self-doubt).
 */

export type CritiqueLens =
  | 'edge_cases'
  | 'security'
  | 'cleanup'
  | 'invariants'
  | 'coverage_gaps';

export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FindingCategory = 'edge_case' | 'security' | 'cleanup' | 'invariant' | 'coverage' | 'synthetic';
export type CritiqueVerdict = 'pass' | 'warn' | 'fail';

export interface CritiqueFinding {
  lens: CritiqueLens;
  category: FindingCategory;
  severity: FindingSeverity;
  message: string;
  line?: number;
}

export interface CritiqueReport {
  timestamp: string;
  findings: CritiqueFinding[];
  score: number;
  verdict: CritiqueVerdict;
  blocksHarness: boolean;
  summary: string;
}

// Minimum number of findings the critique MUST surface (enforces curiosity)
const MINIMUM_FINDINGS = 3;

// Score weights per severity
const SEVERITY_WEIGHTS: Record<FindingSeverity, number> = {
  critical: 40,
  high: 20,
  medium: 8,
  low: 2,
};

// Block harness when score exceeds this or any critical finding exists
const BLOCK_THRESHOLD = 40;

// ---------------------------------------------------------------
// Lens implementations — each is a pure function over a code string
// ---------------------------------------------------------------

function edgeCaseLens(code: string): CritiqueFinding[] {
  const findings: CritiqueFinding[] = [];

  // Division without zero guard — line-by-line to avoid false negatives from comments/URLs
  const divLines = code.split('\n');
  for (let i = 0; i < divLines.length; i++) {
    const divLine = divLines[i];
    const divMatch = divLine.match(/(\w+)\s*\/\s*(\w+)/);
    if (divMatch) {
      const commentIdx = divLine.indexOf('//');
      const matchIdx = divLine.indexOf(divMatch[0]);
      if (
        (commentIdx === -1 || matchIdx < commentIdx) &&
        !divLine.includes('http://') &&
        !divLine.includes('https://') &&
        !/if\s*\(.*===?\s*0/.test(divLine) &&
        !/\?\?/.test(divLine)
      ) {
        findings.push({
          lens: 'edge_cases',
          category: 'edge_case',
          severity: 'medium',
          message: `Division by '${divMatch[2]}' with no zero-guard — will produce Infinity or NaN silently`,
          line: i + 1,
        });
        break;
      }
    }
  }

  // Array index access without bounds check
  const indexAccess = code.match(/(\w+)\[(\d+)\]\.(\w+)/);
  if (indexAccess) {
    findings.push({
      lens: 'edge_cases',
      category: 'edge_case',
      severity: 'medium',
      message: `Direct index access '${indexAccess[0]}' — throws if array is empty or shorter than expected`,
      line: lineOf(code, indexAccess[0]),
    });
  }

  // Unconditional .name / .length on a variable that might be null
  const dotAccess = code.match(/(\w+)\[(\d+)\]\s*\.\s*\w+/);
  if (dotAccess) {
    findings.push({
      lens: 'edge_cases',
      category: 'edge_case',
      severity: 'medium',
      message: `Property access after index '${dotAccess[0]}' without optional chaining — unchecked null path`,
      line: lineOf(code, dotAccess[0]),
    });
  }

  return findings;
}

function securityLens(code: string): CritiqueFinding[] {
  const findings: CritiqueFinding[] = [];

  if (/\beval\s*\(/.test(code)) {
    findings.push({
      lens: 'security',
      category: 'security',
      severity: 'critical',
      message: '`eval()` executes arbitrary code — remote code execution vector if any input is attacker-controlled',
      line: lineOf(code, 'eval('),
    });
  }

  // Prototype pollution: dynamic bracket write with external key
  const protoMatch = code.match(/\w+\[\w+\]\s*=/);
  if (protoMatch && !/const\s+\w+\s*=/.test(code.split('\n').find(l => /\[\w+\]\s*=/.test(l)) ?? '')) {
    findings.push({
      lens: 'security',
      category: 'security',
      severity: 'high',
      message: 'Dynamic property assignment via bracket notation — potential prototype pollution if key is attacker-controlled (__proto__, constructor)',
      line: lineOf(code, protoMatch[0]),
    });
  }

  // Path traversal: readFileSync / readFile with request-derived argument
  if (/readFile(Sync)?\s*\(\s*req\b/.test(code) || /readFile(Sync)?\s*\(\s*\w+\.params/.test(code)) {
    findings.push({
      lens: 'security',
      category: 'security',
      severity: 'critical',
      message: 'File read with request-derived path — path traversal attack (../../etc/passwd) without sanitisation',
      line: lineOf(code, 'readFile'),
    });
  }

  return findings;
}

function cleanupLens(code: string): CritiqueFinding[] {
  const findings: CritiqueFinding[] = [];

  // Promise chain without .catch()
  if (/\.then\s*\(/.test(code) && !/.catch\s*\(/.test(code) && !/await/.test(code)) {
    findings.push({
      lens: 'cleanup',
      category: 'cleanup',
      severity: 'high',
      message: 'Promise `.then()` without `.catch()` — unhandled rejection will crash Node ≥15 / Bun silently',
      line: lineOf(code, '.then('),
    });
  }

  // Empty catch block
  if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(code)) {
    findings.push({
      lens: 'cleanup',
      category: 'cleanup',
      severity: 'medium',
      message: 'Empty catch block silently swallows errors — at minimum log the exception so failures are observable',
      line: lineOf(code, 'catch'),
    });
  }

  return findings;
}

function invariantsLens(code: string): CritiqueFinding[] {
  const findings: CritiqueFinding[] = [];

  // Mutating a parameter that looks like a config/options object
  const paramMutation = code.match(/function\s+\w+\s*\(\s*(\w+)\s*:\s*\w+\s*\)[^{]*\{[^}]*\1\.\w+\s*=/s);
  if (paramMutation) {
    findings.push({
      lens: 'invariants',
      category: 'invariant',
      severity: 'medium',
      message: `Parameter '${paramMutation[1]}' is mutated inside the function — callers share state; violates value-in/value-out contract`,
      line: lineOf(code, paramMutation[0].slice(0, 20)),
    });
  }

  return findings;
}

function coverageGapsLens(code: string, testContent: string): CritiqueFinding[] {
  const findings: CritiqueFinding[] = [];

  // Find exported function names — both `export function f()` and `export const f = () =>`
  const exportedFns = [
    ...code.matchAll(/export\s+(?:async\s+)?function\s+(\w+)|export\s+const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g)
  ].map(m => m[1] || m[2]);

  for (const fn of exportedFns) {
    if (fn && !testContent.includes(fn)) {
      findings.push({
        lens: 'coverage_gaps',
        category: 'coverage',
        severity: 'medium',
        message: `Exported function '${fn}' has no test reference — uncovered path will regress silently`,
        line: lineOf(code, fn),
      });
    }
  }

  return findings;
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

export function runCritiqueLens(
  lens: CritiqueLens,
  code: string,
  opts: { testContent?: string } = {}
): CritiqueFinding[] {
  const testContent = opts.testContent ?? '';
  switch (lens) {
    case 'edge_cases':   return edgeCaseLens(code);
    case 'security':     return securityLens(code);
    case 'cleanup':      return cleanupLens(code);
    case 'invariants':   return invariantsLens(code);
    case 'coverage_gaps': return coverageGapsLens(code, testContent);
  }
}

export function scoreCritique(findings: CritiqueFinding[]): number {
  return findings.reduce((sum, f) => sum + (SEVERITY_WEIGHTS[f.severity] ?? 0), 0);
}

export function enforceMinimumFindings(
  findings: CritiqueFinding[],
  minimum: number
): CritiqueFinding[] {
  if (findings.length >= minimum) return findings;
  const gap = minimum - findings.length;
  const synthetic: CritiqueFinding[] = Array.from({ length: gap }, (_, i) => ({
    lens: 'edge_cases' as CritiqueLens,
    category: 'synthetic' as FindingCategory,
    severity: 'low' as FindingSeverity,
    message: SYNTHETIC_PROMPTS[i % SYNTHETIC_PROMPTS.length],
  }));
  return [...findings, ...synthetic];
}

export function buildCritiqueReport(
  code: string,
  testContent: string
): CritiqueReport {
  const lenses: CritiqueLens[] = ['edge_cases', 'security', 'cleanup', 'invariants', 'coverage_gaps'];
  const raw = lenses.flatMap(l => runCritiqueLens(l, code, { testContent }));
  const findings = enforceMinimumFindings(raw, MINIMUM_FINDINGS);
  const score = scoreCritique(findings);
  const hasCritical = findings.some(f => f.severity === 'critical');
  const blocksHarness = hasCritical || score >= BLOCK_THRESHOLD;

  let verdict: CritiqueVerdict;
  if (hasCritical || score >= BLOCK_THRESHOLD) verdict = 'fail';
  else if (score >= 20) verdict = 'warn';
  else verdict = 'pass';

  const critCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const summary = `Score ${score} | ${findings.length} finding(s): ${critCount} critical, ${highCount} high — verdict: ${verdict}`;

  return {
    timestamp: new Date().toISOString(),
    findings,
    score,
    verdict,
    blocksHarness,
    summary,
  };
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

function lineOf(code: string, snippet: string): number {
  const idx = code.indexOf(snippet);
  if (idx === -1) return 1;
  return code.slice(0, idx).split('\n').length;
}

// Mandatory investigative prompts injected when real findings fall short of minimum.
// These force the reviewing agent to actively look rather than declare "all clear".
const SYNTHETIC_PROMPTS: string[] = [
  'Verify: are there any boundary values (0, -1, MAX_SAFE_INTEGER) that produce incorrect output?',
  'Verify: does concurrent execution of this code cause race conditions or shared-state corruption?',
  'Verify: is every error path observable — logged, emitted, or rethrown — rather than silently swallowed?',
  'Verify: are there implicit type coercions (== vs ===, string+number) that produce surprising results?',
  'Verify: does cleanup always run — even when an exception is thrown mid-function?',
];
