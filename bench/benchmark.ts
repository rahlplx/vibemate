#!/usr/bin/env bun
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface BenchmarkResult {
  label: string;
  runtime: string;
  installMs: number;
  buildMs: number;
  testMs: number;
  typecheckMs: number;
  testCount: number;
  timestamp: string;
}

function measure(cmd: string, cwd: string): { ms: number; output: string } {
  const start = performance.now();
  try {
    const output = execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf-8', timeout: 300000 });
    return { ms: performance.now() - start, output };
  } catch (e: any) {
    return { ms: performance.now() - start, output: e.stdout || e.stderr || '' };
  }
}

function countTests(output: string): number {
  // bun test: "313 pass" or "Ran 313 tests"
  const bunMatch = output.match(/(\d+) pass/) || output.match(/Ran (\d+) tests/);
  if (bunMatch) return parseInt(bunMatch[1]);
  // vitest: "Tests X passed"
  const vitestMatch = output.match(/(\d+) passed/);
  return vitestMatch ? parseInt(vitestMatch[1]) : 0;
}

function runBenchmark(label: string, runtime: string): BenchmarkResult {
  const cwd = process.cwd();
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Benchmarking: ${label} (${runtime})`);
  console.log('='.repeat(60));

  console.log('\n[1/4] Install...');
  const installCmd = runtime === 'bun' ? 'bun install --frozen-lockfile' : 'npm ci --ignore-scripts';
  const install = measure(installCmd, cwd);
  console.log(`  ${install.ms.toFixed(0)}ms`);

  console.log('[2/4] Build...');
  const buildCmd = runtime === 'bun' ? 'bun run build' : 'npm run build';
  const build = measure(buildCmd, cwd);
  console.log(`  ${build.ms.toFixed(0)}ms`);

  console.log('[3/4] TypeCheck...');
  const typecheckCmd = runtime === 'bun' ? 'npx tsc --noEmit' : 'npx tsc --noEmit';
  const typecheck = measure(typecheckCmd, cwd);
  console.log(`  ${typecheck.ms.toFixed(0)}ms`);

  console.log('[4/4] Tests...');
  const testCmd = runtime === 'bun' ? 'bun test' : 'npx vitest run';
  const test = measure(testCmd, cwd);
  const testCount = countTests(test.output);
  console.log(`  ${test.ms.toFixed(0)}ms (${testCount} tests)`);

  const result: BenchmarkResult = {
    label,
    runtime,
    installMs: Math.round(install.ms),
    buildMs: Math.round(build.ms),
    testMs: Math.round(test.ms),
    typecheckMs: Math.round(typecheck.ms),
    testCount,
    timestamp: new Date().toISOString(),
  };

  console.log(`\nResults: install=${result.installMs}ms build=${result.buildMs}ms typecheck=${result.typecheckMs}ms tests=${result.testMs}ms`);
  return result;
}

function printComparison(baseline: BenchmarkResult, current: BenchmarkResult): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log('PERFORMANCE COMPARISON');
  console.log('='.repeat(60));

  const metrics: [keyof BenchmarkResult, string][] = [
    ['installMs', 'Install'],
    ['buildMs', 'Build'],
    ['typecheckMs', 'TypeCheck'],
    ['testMs', 'Tests'],
  ];

  console.log(`\n${'Metric'.padEnd(12)} ${baseline.label.padEnd(20)} ${current.label.padEnd(20)} ${'Speedup'.padEnd(10)}`);
  console.log('-'.repeat(62));

  for (const [key, label] of metrics) {
    const a = baseline[key] as number;
    const b = current[key] as number;
    const speedup = a / b;
    const pct = ((1 - b / a) * 100).toFixed(1);
    console.log(`${label.padEnd(12)} ${String(a + 'ms').padEnd(20)} ${String(b + 'ms').padEnd(20)} ${speedup.toFixed(2)}x (${pct}%)`);
  }

  const totalBaseline = baseline.installMs + baseline.buildMs + baseline.testMs + baseline.typecheckMs;
  const totalCurrent = current.installMs + current.buildMs + current.testMs + current.typecheckMs;
  const totalSpeedup = totalBaseline / totalCurrent;
  console.log('-'.repeat(62));
  console.log(`${'TOTAL'.padEnd(12)} ${String(totalBaseline + 'ms').padEnd(20)} ${String(totalCurrent + 'ms').padEnd(20)} ${totalSpeedup.toFixed(2)}x`);
  console.log(`\nTests: ${baseline.testCount} → ${current.testCount}`);
}

// Main
const resultsDir = join(process.cwd(), '.vibe', 'benchmarks');
if (!existsSync(resultsDir)) mkdirSync(resultsDir, { recursive: true });

const mode = process.argv[2] || 'baseline';
let result: BenchmarkResult;

if (mode === 'baseline') {
  result = runBenchmark('npm/node/vitest', 'npm');
} else {
  result = runBenchmark('bun', 'bun');
}

const resultPath = join(resultsDir, `${mode}-${Date.now()}.json`);
writeFileSync(resultPath, JSON.stringify(result, null, 2));
console.log(`\nSaved: ${resultPath}`);

// Compare if baseline exists
if (mode === 'bun') {
  const { readdirSync, readFileSync } = await import('fs');
  const files = readdirSync(resultsDir).filter(f => f.startsWith('baseline-'));
  if (files.length > 0) {
    const baselinePath = join(resultsDir, files.sort().pop()!);
    const baseline: BenchmarkResult = JSON.parse(readFileSync(baselinePath, 'utf-8'));
    printComparison(baseline, result);
  }
}
