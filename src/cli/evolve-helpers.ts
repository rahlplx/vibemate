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

export interface MineOnCronOptions {
  urls: string[];
  depth: number;
  vibeDir: string;
}

export type MineRepoFn = (url: string, opts: { depth: number; vibeDir: string }) => Promise<{ analysis: { fileCount: number }; jsonlRecordsWritten: number }>;

export async function runMineOnCron(
  urls: string[],
  options: { depth?: number; vibeDir?: string },
  mineFn: MineRepoFn,
  log: (msg: string) => void = console.log,
  warn: (msg: string) => void = console.warn,
): Promise<void> {
  if (urls.length === 0) return;
  log(`\n📦 Mining ${urls.length} configured repo(s)...`);
  for (const url of urls) {
    try {
      log(`  Mining: ${url}`);
      const result = await mineFn(url, { depth: options.depth ?? 100, vibeDir: options.vibeDir ?? '.vibe' });
      log(`  ✓ ${result.analysis.fileCount} files, ${result.jsonlRecordsWritten} JSONL records`);
    } catch (e) {
      warn(`  ⚠ Failed to mine ${url}: ${e instanceof Error ? e.message : e}`);
    }
  }
}
