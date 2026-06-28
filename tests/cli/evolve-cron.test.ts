import { describe, it, expect } from 'bun:test';

import { runEvolveCron, runMineOnCron, type MineRepoFn } from '../../src/cli/evolve-helpers.js';

describe('vibemate evolve --cron', () => {
  it('calls improve() with a telemetryMetrics object', async () => {
    const calls: unknown[] = [];
    const fakeOrchestrator = {
      improve: async (trajectory: unknown) => {
        calls.push(trajectory);
        return { retroFeedback: {}, newRules: [], principle: {} };
      }
    };

    await runEvolveCron(fakeOrchestrator as Parameters<typeof runEvolveCron>[0]);

    expect(calls.length).toBe(1);
    const call = calls[0] as { taskId: string; steps: string[]; outcome: string; telemetryMetrics: object };
    expect(call.taskId).toMatch(/^cron-/);
    expect(Array.isArray(call.steps)).toBe(true);
    expect(call.outcome).toBe('success');
    expect(call.telemetryMetrics).toBeDefined();
    expect(typeof (call.telemetryMetrics as { failureRate: number }).failureRate).toBe('number');
    expect(typeof (call.telemetryMetrics as { averageReward: number }).averageReward).toBe('number');
    expect(typeof (call.telemetryMetrics as { stuckDetections: number }).stuckDetections).toBe('number');
  });

  it('improve() trajectory has outcome success', async () => {
    const captured: { outcome?: string }[] = [];
    const fakeOrchestrator = {
      improve: async (t: { outcome?: string }) => {
        captured.push(t);
        return { retroFeedback: {}, newRules: [], principle: {} };
      }
    };

    await runEvolveCron(fakeOrchestrator as Parameters<typeof runEvolveCron>[0]);

    expect(captured[0]?.outcome).toBe('success');
  });
});

describe('runMineOnCron — cron mining integration', () => {
  it('does nothing when urls list is empty', async () => {
    const called: string[] = [];
    const fakeMine: MineRepoFn = async (url) => {
      called.push(url);
      return { analysis: { fileCount: 1 }, jsonlRecordsWritten: 1 };
    };
    await runMineOnCron([], {}, fakeMine, () => {}, () => {});
    expect(called.length).toBe(0);
  });

  it('calls mineFn once per URL', async () => {
    const called: string[] = [];
    const fakeMine: MineRepoFn = async (url) => {
      called.push(url);
      return { analysis: { fileCount: 10 }, jsonlRecordsWritten: 1 };
    };
    const urls = ['https://github.com/a/repo1', 'https://github.com/b/repo2'];
    await runMineOnCron(urls, { depth: 50, vibeDir: '/tmp/.vibe' }, fakeMine, () => {}, () => {});
    expect(called).toEqual(urls);
  });

  it('passes depth and vibeDir through to mineFn', async () => {
    const opts: { depth: number; vibeDir: string }[] = [];
    const fakeMine: MineRepoFn = async (_url, o) => {
      opts.push(o);
      return { analysis: { fileCount: 5 }, jsonlRecordsWritten: 1 };
    };
    await runMineOnCron(['https://github.com/x/y'], { depth: 77, vibeDir: '/custom/.vibe' }, fakeMine, () => {}, () => {});
    expect(opts[0].depth).toBe(77);
    expect(opts[0].vibeDir).toBe('/custom/.vibe');
  });

  it('defaults depth to 100 and vibeDir to .vibe when not provided', async () => {
    const opts: { depth: number; vibeDir: string }[] = [];
    const fakeMine: MineRepoFn = async (_url, o) => {
      opts.push(o);
      return { analysis: { fileCount: 2 }, jsonlRecordsWritten: 1 };
    };
    await runMineOnCron(['https://github.com/x/y'], {}, fakeMine, () => {}, () => {});
    expect(opts[0].depth).toBe(100);
    expect(opts[0].vibeDir).toBe('.vibe');
  });

  it('continues mining remaining URLs when one fails', async () => {
    const called: string[] = [];
    const warnings: string[] = [];
    const fakeMine: MineRepoFn = async (url) => {
      called.push(url);
      if (url.includes('bad')) throw new Error('clone failed');
      return { analysis: { fileCount: 3 }, jsonlRecordsWritten: 1 };
    };
    const urls = ['https://github.com/good/repo', 'https://github.com/bad/repo', 'https://github.com/also/good'];
    await runMineOnCron(urls, {}, fakeMine, () => {}, (w) => warnings.push(w));
    expect(called).toEqual(urls);
    expect(warnings.some(w => w.includes('bad'))).toBe(true);
  });

  it('emits a log line per successfully mined URL', async () => {
    const logs: string[] = [];
    const fakeMine: MineRepoFn = async () => ({ analysis: { fileCount: 7 }, jsonlRecordsWritten: 2 });
    await runMineOnCron(['https://github.com/x/y'], {}, fakeMine, (m) => logs.push(m), () => {});
    expect(logs.some(l => l.includes('Mining'))).toBe(true);
    expect(logs.some(l => l.includes('7 files'))).toBe(true);
  });
});
