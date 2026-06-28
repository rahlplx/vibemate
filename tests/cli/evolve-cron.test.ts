import { describe, it, expect, mock } from 'bun:test';

// Test that the evolve --cron command calls improve() with the right shape
// We test via the exported runEvolveCron helper rather than spawning the CLI.
import { runEvolveCron } from '../../src/cli/evolve-helpers.js';

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
