import { describe, it, expect } from 'bun:test';
import { spawnSync } from 'child_process';
import { join } from 'path';

const CLI = join(import.meta.dir, '../../src/cli/index.ts');

function runCLI(args: string[], cwd?: string): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync('bun', ['run', CLI, ...args], {
    encoding: 'utf-8',
    cwd: cwd ?? process.cwd(),
    timeout: 15_000,
    env: { ...process.env, CI: '1', NO_COLOR: '1' },
  });
  if (result.error) throw result.error;
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}

describe('mine command E2E', () => {
  it('vibemate mine --help exits 0', () => {
    const { stdout, exitCode } = runCLI(['mine', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('depth');
  });

  it('vibemate mine rejects invalid URL', () => {
    const { exitCode, stderr } = runCLI(['mine', 'not-a-url']);
    expect(exitCode).not.toBe(0);
    expect(stderr).toMatch(/url|invalid|scheme/i);
  });

  it('vibemate mine --dry-run prints plan without cloning', () => {
    const { stdout, stderr, exitCode } = runCLI([
      'mine',
      'https://github.com/modelcontextprotocol/typescript-sdk',
      '--dry-run',
    ]);
    expect(exitCode).toBe(0);
    expect(stdout + stderr).toMatch(/dry.?run|would|plan|mine/i);
  });
});
