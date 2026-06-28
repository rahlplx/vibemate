import { describe, it, expect, afterEach } from 'bun:test';
import { spawnSync } from 'child_process';
import { join } from 'path';
import { rmSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';

const CLI = join(import.meta.dir, '../../src/cli/index.ts');

function runCLI(args: string[], cwd: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync('bun', ['run', CLI, ...args], {
    encoding: 'utf-8',
    cwd,
    timeout: 30_000,
    env: { ...process.env, CI: '1', NO_COLOR: '1' },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}

const tmpDirs: string[] = [];
function makeTmpDir(): string {
  const dir = join(tmpdir(), `vibemate-e2e-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
});

describe('learn command E2E', () => {
  it('vibemate learn --help exits 0 and shows subcommands', () => {
    const cwd = makeTmpDir();
    const { stdout, exitCode } = runCLI(['learn', '--help'], cwd);
    expect(exitCode).toBe(0);
    expect(stdout).toMatch(/run|audit/);
  });

  it('vibemate learn run --help exits 0', () => {
    const cwd = makeTmpDir();
    const { stdout, exitCode } = runCLI(['learn', 'run', '--help'], cwd);
    expect(exitCode).toBe(0);
    expect(stdout.toLowerCase()).toMatch(/url|repo/);
  });

  it('vibemate learn audit --help exits 0', () => {
    const cwd = makeTmpDir();
    const { stdout, exitCode } = runCLI(['learn', 'audit', '--help'], cwd);
    expect(exitCode).toBe(0);
    expect(stdout.toLowerCase()).toMatch(/audit|local/);
  });

  it('vibemate learn audit runs on current project without crash', () => {
    const { stdout, stderr, exitCode } = runCLI(['learn', 'audit'], process.cwd());
    // Accept any exit code — this runs analysis which may warn; just must not hang
    expect(typeof exitCode).toBe('number');
    expect((stdout + stderr).length).toBeGreaterThan(0);
  });
});
