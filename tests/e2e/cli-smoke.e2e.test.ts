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
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}

describe('CLI smoke tests', () => {
  it('vibemate --help exits 0 and lists core commands', () => {
    const { stdout, exitCode } = runCLI(['--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('mine');
    expect(stdout).toContain('evolve');
    expect(stdout).toContain('spec');
    expect(stdout).toContain('install');
  });

  it('vibemate --version exits 0 and prints semver', () => {
    const { exitCode, stdout } = runCLI(['--version']);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
  });

  it('vibemate mine --help exits 0', () => {
    const { stdout, exitCode } = runCLI(['mine', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('depth');
  });

  it('vibemate evolve --help exits 0', () => {
    const { stdout, exitCode } = runCLI(['evolve', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout.toLowerCase()).toContain('evolve');
  });

  it('vibemate spec --help exits 0', () => {
    const { stdout, exitCode } = runCLI(['spec', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout.toLowerCase()).toMatch(/spec|idea/);
  });

  it('vibemate learn --help exits 0', () => {
    const { stdout, exitCode } = runCLI(['learn', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout.toLowerCase()).toMatch(/learn|pattern/);
  });

  it('unknown subcommand exits non-zero', () => {
    const { exitCode } = runCLI(['notacommand-xyz']);
    expect(exitCode).not.toBe(0);
  });
});
