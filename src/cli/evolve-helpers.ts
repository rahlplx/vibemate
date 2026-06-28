import { SelfImprovementOrchestrator } from '../evolve/index.js';

type OrchestratorLike = Pick<SelfImprovementOrchestrator, 'improve'>;

export async function runEvolveCron(orchestrator: OrchestratorLike): Promise<void> {
  await orchestrator.improve({
    taskId: `cron-${Date.now()}`,
    steps: ['weekly-reflection'],
    outcome: 'success',
    telemetryMetrics: {
      failureRate: 0,
      averageReward: 1,
      stuckDetections: 0
    }
  });
}
