// Vibemate Evolve Command - Manage self-improvement and evolution
import { Command } from 'commander';
import { SelfImprovementOrchestrator } from '../evolve/index.js';
import { OKFGenerator } from '../okf/generator.js';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

interface EvolveOptions {
  action?: 'status' | 'trigger' | 'reset';
}

export function evolveCommand(program: Command): void {
  program
    .command('evolve')
    .description('Manage self-improvement and evolution')
    .option('-a, --action <action>', 'Action to perform (status, trigger, reset)', 'status')
    .action(async (options: EvolveOptions) => {
      await manageEvolution(options);
    });
}

async function manageEvolution(options: EvolveOptions): Promise<void> {
  const root = process.cwd();
  const okfGenerator = new OKFGenerator(root);
  const orchestrator = new SelfImprovementOrchestrator(okfGenerator);

  switch (options.action) {
    case 'status':
      await showEvolutionStatus(root, orchestrator);
      break;
    case 'trigger':
      await triggerEvolution(root, orchestrator);
      break;
    case 'reset':
      await resetEvolution(root);
      break;
    default:
      await showEvolutionStatus(root, orchestrator);
  }
}

async function showEvolutionStatus(root: string, orchestrator: SelfImprovementOrchestrator): Promise<void> {
  console.log('🧬 Evolution Status\n');

  const stats = orchestrator.getStats();

  console.log('Retro Agent:');
  console.log(`  Total learnings: ${stats.retro.totalLearnings}`);

  console.log('\nEvolve Agent:');
  console.log(`  Total rules: ${stats.evolve.totalRules}`);
  console.log(`  Average quality: ${(stats.evolve.averageQuality * 100).toFixed(1)}%`);
  console.log(`  Underperforming: ${stats.evolve.underperforming}`);

  console.log('\nLearn Agent:');
  console.log(`  Total principles: ${stats.learn.totalPrinciples}`);
  console.log(`  Average effectiveness: ${(stats.learn.averageEffectiveness * 100).toFixed(1)}%`);

  // Load evolution.json
  try {
    const evolutionPath = join(root, '.vibe', 'evolution.json');
    const content = await readFile(evolutionPath, 'utf-8');
    const evolution = JSON.parse(content);

    console.log('\nEvolution History:');
    console.log(`  Rules defined: ${evolution.rules?.length || 0}`);
    console.log(`  Learnings captured: ${evolution.learnings?.length || 0}`);
    console.log(`  Principles stored: ${evolution.principles?.length || 0}`);
    console.log(`  Last reflection: ${evolution.lastReflection || 'Never'}`);

  } catch (error) {
    console.error(`[Evolve] Failed to read evolution.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('\n⚠️  No evolution data found. Run "vibemate evolve --action trigger" to start.');
  }
}

async function triggerEvolution(root: string, orchestrator: SelfImprovementOrchestrator): Promise<void> {
  console.log('🔄 Triggering evolution cycle...\n');

  // Simulate a completed task for learning
  const mockTrajectory = {
    taskId: `manual-trigger-${Date.now()}`,
    steps: ['analyze', 'implement', 'test', 'deploy'],
    outcome: 'success' as const,
    telemetryMetrics: {
      failureRate: 0.1,
      averageReward: 0.8,
      stuckDetections: 0
    }
  };

  console.log('📚 Running Retro reflection...');
  const result = await orchestrator.improve(mockTrajectory);

  console.log('\n✅ Evolution cycle complete!');
  console.log(`\nRetro Feedback:`);
  console.log(`  Numerical: ${result.retroFeedback.numerical}`);
  console.log(`  Lesson: ${result.retroFeedback.language}`);
  console.log(`  Prediction: ${result.retroFeedback.successPrediction}`);

  if (result.newRules.length > 0) {
    console.log(`\nNew Rules Generated:`);
    for (const rule of result.newRules) {
      console.log(`  - ${rule.name}: ${rule.description}`);
    }
  }

  console.log(`\nPrinciple Learned:`);
  console.log(`  "${result.principle.principle}"`);

  // Update evolution.json
  try {
    const evolutionPath = join(root, '.vibe', 'evolution.json');
    const content = await readFile(evolutionPath, 'utf-8');
    const evolution = JSON.parse(content);

    evolution.learnings = evolution.learnings || [];
    evolution.learnings.push({
      timestamp: new Date().toISOString(),
      feedback: result.retroFeedback
    });

    evolution.principles = evolution.principles || [];
    evolution.principles.push(result.principle);

    evolution.lastReflection = new Date().toISOString();

    await writeFile(evolutionPath, JSON.stringify(evolution, null, 2));
    console.log('\n📊 Evolution data updated.');
  } catch (error) {
    console.error(`[Evolve] Failed to update evolution.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('\n⚠️  Could not update evolution.json');
  }
}

async function resetEvolution(root: string): Promise<void> {
  console.log('🗑️  Resetting evolution data...\n');

  const evolutionPath = join(root, '.vibe', 'evolution.json');
  
  const resetData = {
    rules: [],
    learnings: [],
    principles: [],
    lastReflection: null,
    createdAt: new Date().toISOString()
  };

  await writeFile(evolutionPath, JSON.stringify(resetData, null, 2));
  console.log('✅ Evolution data reset.');
}
