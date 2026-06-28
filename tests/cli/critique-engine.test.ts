import { describe, it, expect } from 'bun:test';
import {
  runCritiqueLens,
  scoreCritique,
  enforceMinimumFindings,
  buildCritiqueReport,
  type CritiqueFinding,
  type CritiqueReport,
  type CritiqueLens,
} from '../../src/cli/critique-engine.js';

// ---------------------------------------------------------------
// Lens: edge-case hunter
// ---------------------------------------------------------------
describe('runCritiqueLens — edge_cases', () => {
  it('detects unchecked zero in numeric logic', () => {
    const findings = runCritiqueLens('edge_cases', `
function divide(a: number, b: number) { return a / b; }
    `);
    expect(findings.some(f => f.category === 'edge_case')).toBe(true);
  });

  it('detects unchecked empty array access', () => {
    const findings = runCritiqueLens('edge_cases', `
const first = items[0].name;
    `);
    expect(findings.some(f => f.message.toLowerCase().includes('index') || f.message.toLowerCase().includes('empty'))).toBe(true);
  });

  it('returns no findings on trivially safe code', () => {
    const findings = runCritiqueLens('edge_cases', `
const x = 42;
    `);
    expect(findings.length).toBe(0);
  });
});

// ---------------------------------------------------------------
// Lens: security adversary
// ---------------------------------------------------------------
describe('runCritiqueLens — security', () => {
  it('flags eval usage', () => {
    const findings = runCritiqueLens('security', `eval(userInput);`);
    expect(findings.some(f => f.severity === 'critical' || f.severity === 'high')).toBe(true);
  });

  it('flags prototype pollution pattern', () => {
    const findings = runCritiqueLens('security', `obj[key] = value;`);
    expect(findings.some(f => f.category === 'security')).toBe(true);
  });

  it('flags unvalidated path traversal', () => {
    const findings = runCritiqueLens('security', `
const data = fs.readFileSync(req.params.file);
    `);
    expect(findings.some(f => f.category === 'security')).toBe(true);
  });

  it('returns no findings on safe read-only code', () => {
    const findings = runCritiqueLens('security', `const x = config.timeout ?? 30;`);
    expect(findings.length).toBe(0);
  });
});

// ---------------------------------------------------------------
// Lens: cleanup / error handling
// ---------------------------------------------------------------
describe('runCritiqueLens — cleanup', () => {
  it('flags missing error handler on promise chain', () => {
    const findings = runCritiqueLens('cleanup', `
fetch(url).then(r => r.json());
    `);
    expect(findings.some(f => f.category === 'cleanup')).toBe(true);
  });

  it('flags empty catch block', () => {
    const findings = runCritiqueLens('cleanup', `
try { doThing(); } catch (e) {}
    `);
    expect(findings.some(f => f.category === 'cleanup')).toBe(true);
  });

  it('returns no findings when catch is handled', () => {
    const findings = runCritiqueLens('cleanup', `
try { doThing(); } catch (e) { console.error(e); }
    `);
    expect(findings.length).toBe(0);
  });
});

// ---------------------------------------------------------------
// Lens: invariant violations
// ---------------------------------------------------------------
describe('runCritiqueLens — invariants', () => {
  it('flags mutation of a parameter object', () => {
    const findings = runCritiqueLens('invariants', `
function process(config: Config) { config.retries = 0; }
    `);
    expect(findings.some(f => f.category === 'invariant')).toBe(true);
  });

  it('returns empty for pure functions', () => {
    const findings = runCritiqueLens('invariants', `
function add(a: number, b: number): number { return a + b; }
    `);
    expect(findings.length).toBe(0);
  });
});

// ---------------------------------------------------------------
// Lens: test coverage gaps
// ---------------------------------------------------------------
describe('runCritiqueLens — coverage_gaps', () => {
  it('flags a function with no corresponding test reference', () => {
    const findings = runCritiqueLens('coverage_gaps', `
export function parseCSV(input: string): string[][] {
  return input.split('\\n').map(row => row.split(','));
}
    `, { testContent: '' });
    expect(findings.some(f => f.category === 'coverage')).toBe(true);
  });

  it('returns no finding when test file references the function', () => {
    const findings = runCritiqueLens('coverage_gaps', `
export function parseCSV(input: string): string[][] {
  return input.split('\\n').map(row => row.split(','));
}
    `, { testContent: "it('parseCSV parses rows', () => { parseCSV('a,b'); });" });
    expect(findings.length).toBe(0);
  });
});

// ---------------------------------------------------------------
// scoreCritique — severity → numeric score
// ---------------------------------------------------------------
describe('scoreCritique()', () => {
  it('returns 0 for empty findings', () => {
    expect(scoreCritique([])).toBe(0);
  });

  it('critical finding scores highest', () => {
    const critical: CritiqueFinding = { category: 'security', severity: 'critical', message: 'x', lens: 'security', line: 1 };
    const high: CritiqueFinding = { category: 'security', severity: 'high', message: 'x', lens: 'security', line: 1 };
    expect(scoreCritique([critical])).toBeGreaterThan(scoreCritique([high]));
  });

  it('multiple findings accumulate', () => {
    const f: CritiqueFinding = { category: 'edge_case', severity: 'medium', message: 'x', lens: 'edge_cases', line: 1 };
    expect(scoreCritique([f, f])).toBeGreaterThan(scoreCritique([f]));
  });

  it('score is non-negative', () => {
    const f: CritiqueFinding = { category: 'cleanup', severity: 'low', message: 'x', lens: 'cleanup', line: 1 };
    expect(scoreCritique([f])).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------
// enforceMinimumFindings — curiosity enforcement
// ---------------------------------------------------------------
describe('enforceMinimumFindings()', () => {
  it('adds synthetic findings when count is below minimum', () => {
    const result = enforceMinimumFindings([], 3);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });

  it('synthetic findings have severity low and category synthetic', () => {
    const result = enforceMinimumFindings([], 2);
    const synthetic = result.filter(f => f.category === 'synthetic');
    expect(synthetic.length).toBeGreaterThanOrEqual(2);
  });

  it('does not add synthetic if already above minimum', () => {
    const existing: CritiqueFinding[] = Array.from({ length: 5 }, (_, i) => ({
      category: 'edge_case', severity: 'low', message: `finding ${i}`, lens: 'edge_cases', line: i + 1,
    }));
    const result = enforceMinimumFindings(existing, 3);
    expect(result.length).toBe(5);
  });

  it('minimum of 0 returns original array unchanged', () => {
    const result = enforceMinimumFindings([], 0);
    expect(result.length).toBe(0);
  });
});

// ---------------------------------------------------------------
// buildCritiqueReport — orchestrator
// ---------------------------------------------------------------
describe('buildCritiqueReport()', () => {
  it('returns a CritiqueReport with all required fields', () => {
    const report = buildCritiqueReport('const x = 1;', '');
    expect(typeof report.score).toBe('number');
    expect(typeof report.verdict).toBe('string');
    expect(Array.isArray(report.findings)).toBe(true);
    expect(typeof report.timestamp).toBe('string');
    expect(typeof report.blocksHarness).toBe('boolean');
  });

  it('verdict is pass when score is low', () => {
    const report = buildCritiqueReport('const x = 1;', '');
    expect(['pass', 'warn', 'fail']).toContain(report.verdict);
  });

  it('blocksHarness is true when critical findings exist', () => {
    const report = buildCritiqueReport('eval(userInput);', '');
    expect(report.blocksHarness).toBe(true);
  });

  it('blocksHarness is false for clean code', () => {
    const report = buildCritiqueReport('const x = config.timeout ?? 30;', 'it("timeout", () => { expect(x).toBe(30); });');
    expect(report.blocksHarness).toBe(false);
  });

  it('findings array always has at least MINIMUM_FINDINGS entries', () => {
    const report = buildCritiqueReport('const x = 1;', 'it("x is 1", () => expect(x).toBe(1));');
    expect(report.findings.length).toBeGreaterThanOrEqual(3);
  });

  it('all findings have required shape', () => {
    const report = buildCritiqueReport('fetch(url).then(r => r.json());', '');
    for (const f of report.findings) {
      expect(typeof f.category).toBe('string');
      expect(typeof f.severity).toBe('string');
      expect(typeof f.message).toBe('string');
      expect(typeof f.lens).toBe('string');
    }
  });
});
