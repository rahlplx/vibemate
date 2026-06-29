import { describe, it, expect } from 'bun:test';
import {
  createSubagentRunner,
  createMockSubagentRunner,
  type SubagentResult,
} from '../../src/execution/subagent.js';

describe('createMockSubagentRunner', () => {
  it('returns default success result when no responses provided', async () => {
    const runner = createMockSubagentRunner();
    const result = await runner.run('echo', ['hello']);
    expect(result.exitCode).toBe(0);
    expect(result.timedOut).toBe(false);
  });

  it('returns provided result', async () => {
    const runner = createMockSubagentRunner([{ exitCode: 1, stderr: 'boom', stdout: '', timedOut: false }]);
    const result = await runner.run('fail', []);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('boom');
  });

  it('cycles through multiple responses', async () => {
    const responses: SubagentResult[] = [
      { exitCode: 0, stdout: 'first', stderr: '', timedOut: false },
      { exitCode: 1, stdout: '', stderr: 'second', timedOut: false },
    ];
    const runner = createMockSubagentRunner(responses);
    const r1 = await runner.run('cmd', []);
    const r2 = await runner.run('cmd', []);
    expect(r1.stdout).toBe('first');
    expect(r2.exitCode).toBe(1);
  });

  it('wraps around after exhausting responses', async () => {
    const runner = createMockSubagentRunner([{ exitCode: 0, stdout: 'only', stderr: '', timedOut: false }]);
    await runner.run('cmd', []);
    const r2 = await runner.run('cmd', []);
    expect(r2.stdout).toBe('only');
  });

  it('records the command and args passed to each call', async () => {
    const runner = createMockSubagentRunner();
    await runner.run('bun', ['run', 'build'], { cwd: '/tmp' });
    expect(runner.calls[0]).toEqual({ command: 'bun', args: ['run', 'build'], options: { cwd: '/tmp' } });
  });

  it('success flag is true when exitCode is 0', async () => {
    const runner = createMockSubagentRunner([{ exitCode: 0, stdout: '', stderr: '', timedOut: false }]);
    const result = await runner.run('ok', []);
    expect(result.success).toBe(true);
  });

  it('success flag is false when exitCode is non-zero', async () => {
    const runner = createMockSubagentRunner([{ exitCode: 2, stdout: '', stderr: 'err', timedOut: false }]);
    const result = await runner.run('fail', []);
    expect(result.success).toBe(false);
  });

  it('success flag is false when timedOut is true', async () => {
    const runner = createMockSubagentRunner([{ exitCode: -1, stdout: '', stderr: '', timedOut: true }]);
    const result = await runner.run('slow', []);
    expect(result.success).toBe(false);
  });
});

describe('createSubagentRunner', () => {
  it('returns an object with a run method', () => {
    const runner = createSubagentRunner();
    expect(typeof runner.run).toBe('function');
  });

  it('actually runs a real process and captures stdout', async () => {
    const runner = createSubagentRunner();
    const result = await runner.run('echo', ['hello-from-subagent']);
    expect(result.stdout.trim()).toBe('hello-from-subagent');
    expect(result.exitCode).toBe(0);
    expect(result.success).toBe(true);
  });

  it('returns non-zero exitCode for a failing command', async () => {
    const runner = createSubagentRunner();
    const result = await runner.run('false', []);
    expect(result.exitCode).not.toBe(0);
    expect(result.success).toBe(false);
  });

  it('captures stderr from real process', async () => {
    const runner = createSubagentRunner();
    const result = await runner.run('sh', ['-c', 'echo err >&2; exit 1']);
    expect(result.stderr.trim()).toBe('err');
  });
});
