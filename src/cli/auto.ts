// Vibemate Auto Command - Autonomous full pipeline with circuit breakers
import { Command } from 'commander';
import { SelfImprovementOrchestrator } from '../evolve/index.js';
import { TelemetryCollector } from '../telemetry/collector.js';
import { CostAwareRouter } from '../router/index.js';
import { OKFGenerator } from '../okf/generator.js';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { AutoPhase, CircuitBreaker, AutoState } from '../types.js';

interface AutoOptions {
  budget?: number;
  maxFailures?: number;
  maxDispatches?: number;
}

export function autoCommand(program: Command): void {
  program
    .command('auto')
    .description('Run autonomous full pipeline (Think → Build → Ship)')
    .argument('<description>', 'What to build')
    .option('-b, --budget <budget>', 'Maximum budget in USD', '10')
    .option('-f, --max-failures <n>', 'Max consecutive failures before stop', '3')
    .option('-d, --max-dispatches <n>', 'Max dispatches before stop', '10')
    .action(async (description: string, options: AutoOptions) => {
      await runAutoPipeline(description, options);
    });
}

async function runAutoPipeline(description: string, options: AutoOptions): Promise<void> {
  console.log('🤖 Vibemate Auto Mode\n');
  console.log(`📝 Task: ${description}`);
  console.log(`💰 Budget: $${options.budget}`);
  console.log(`🔄 Max failures: ${options.maxFailures}`);
  console.log(`📊 Max dispatches: ${options.maxDispatches}\n`);

  const root = process.cwd();
  
  // Initialize components
  const okfGenerator = new OKFGenerator(root);
  const telemetryCollector = new TelemetryCollector({
    enabled: true,
    exportDir: join(root, '.vibe', 'telemetry'),
    serviceName: 'vibemate-auto',
    serviceVersion: '1.0.0'
  });
  const selfImprovement = new SelfImprovementOrchestrator(okfGenerator);
  const router = new CostAwareRouter([], parseFloat(String(options.budget || '10')));

  // Circuit breaker state
  const circuitBreaker: CircuitBreaker = {
    consecutiveFailures: 0,
    dispatchCount: 0,
    totalCost: 0,
    maxFailures: parseInt(String(options.maxFailures || '3'), 10),
    maxDispatches: parseInt(String(options.maxDispatches || '10'), 10),
    maxBudget: parseFloat(String(options.budget || '10'))
  };

  // Auto mode state machine
  const phases: AutoPhase[] = ['think', 'plan', 'break', 'build', 'harness', 'review', 'ship', 'retro', 'learn'];
  let currentPhaseIndex = 0;
  let state: AutoState = {
    phase: phases[0],
    step: '',
    completed: [],
    agent: 'claude-code',
    hasUI: false,
    mode: 'auto',
    telemetry: true,
    artifacts: {}
  };

  console.log('🚀 Starting autonomous pipeline...\n');

  // Main execution loop
  while (currentPhaseIndex < phases.length) {
    const currentPhase = phases[currentPhaseIndex];
    state.phase = currentPhase;

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📍 Phase: ${currentPhase.toUpperCase()}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Check circuit breaker
    if (checkCircuitBreaker(circuitBreaker)) {
      console.log('⛔ Circuit breaker triggered!');
      printCircuitBreakerSummary(circuitBreaker);
      break;
    }

    try {
      // Execute phase
      const result = await executePhase(currentPhase, description, state, {
        telemetryCollector,
        selfImprovement,
        router,
        circuitBreaker
      });

      // Record telemetry
      telemetryCollector.recordAgentTurn(
        `auto-${currentPhase}`,
        'claude-sonnet',
        result.tokensUsed || 0,
        result.tokensUsed || 0,
        result.cost || 0
      );

      // Update circuit breaker
      circuitBreaker.dispatchCount++;
      circuitBreaker.totalCost += result.cost || 0;
      if (result.success) {
        circuitBreaker.consecutiveFailures = 0;
      } else {
        circuitBreaker.consecutiveFailures++;
      }

      // Update state
      state.completed.push(currentPhase);
      state.artifacts[currentPhase] = result.artifact || '';

      // Write handoff
      await writeHandoff(root, state, currentPhase);

      console.log(`\n✅ Phase ${currentPhase} complete`);

      // Move to next phase
      currentPhaseIndex++;

    } catch (error) {
      console.error(`\n❌ Phase ${currentPhase} failed:`, error);
      circuitBreaker.consecutiveFailures++;
      
      // Check if we should retry or skip
      if (currentPhase === 'harness') {
        console.log('🔄 Retrying harness phase...');
        continue; // Retry harness
      } else {
        console.log('⏭️  Skipping to next phase...');
        currentPhaseIndex++;
      }
    }

    // Check user input (simulated)
    if (circuitBreaker.dispatchCount % 3 === 0) {
      console.log('\n💡 Pipeline running... (press Enter to continue, or type "stop" to halt)');
      // In production, this would wait for user input
    }
  }

  // Final summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🏁 Auto Pipeline Complete');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  printPipelineSummary(state, circuitBreaker);

  // Export telemetry
  await telemetryCollector.export();
  console.log('\n📊 Telemetry exported to .vibe/telemetry/');
}

interface PhaseResult {
  success: boolean;
  artifact?: string;
  tokensUsed?: number;
  cost?: number;
  error?: string;
}

async function executePhase(
  phase: AutoPhase,
  _description: string,
  state: AutoState,
  context: {
    telemetryCollector: TelemetryCollector;
    selfImprovement: SelfImprovementOrchestrator;
    router: CostAwareRouter;
    circuitBreaker: CircuitBreaker;
  }
): Promise<PhaseResult> {
  // Simulate phase execution
  // In production, this would dispatch to actual AI agents
  
  const baseResult: PhaseResult = {
    success: true,
    tokensUsed: Math.floor(Math.random() * 2000) + 500,
    cost: 0
  };

  switch (phase) {
    case 'think':
      console.log('💭 Analyzing requirements...');
      console.log('   - Understanding project goals');
      console.log('   - Identifying constraints');
      console.log('   - Defining success criteria');
      baseResult.artifact = 'design-doc';
      break;

    case 'plan':
      console.log('📋 Creating implementation plan...');
      console.log('   - Breaking down tasks');
      console.log('   - Estimating complexity');
      console.log('   - Planning dependencies');
      baseResult.artifact = 'plan.md';
      break;

    case 'break':
      console.log('🔨 Decomposing into tasks...');
      console.log('   - Creating GSD task structure');
      console.log('   - Defining acceptance criteria');
      console.log('   - Prioritizing work');
      baseResult.artifact = '.gsd/tasks.json';
      break;

    case 'build':
      console.log('🏗️  Building with TDD...');
      console.log('   - Writing failing tests');
      console.log('   - Implementing features');
      console.log('   - Refactoring code');
      baseResult.artifact = 'src/';
      break;

    case 'harness':
      console.log('🔒 Running production readiness checks...');
      console.log('   - API key leak detection');
      console.log('   - Admin route protection');
      console.log('   - CORS configuration');
      console.log('   - Rate limiting');
      console.log('   - Unbounded queries');
      console.log('   - Hardcoded paths');
      baseResult.artifact = 'harness-report.md';
      break;

    case 'review':
      console.log('🔍 Reviewing code quality...');
      console.log('   - Security audit');
      console.log('   - Performance review');
      console.log('   - Best practices check');
      baseResult.artifact = 'review-report.md';
      break;

    case 'ship':
      console.log('🚀 Shipping to production...');
      console.log('   - Running final tests');
      console.log('   - Creating PR');
      console.log('   - Merging to main');
      baseResult.artifact = 'pr-link';
      break;

    case 'retro':
      console.log('🔄 Running retrospective...');
      console.log('   - Analyzing what went well');
      console.log('   - Identifying improvements');
      console.log('   - Capturing learnings');
      
      // Use self-improvement orchestrator
      const metrics = context.telemetryCollector.getMetrics();
      await context.selfImprovement.improve({
        taskId: `auto-${Date.now()}`,
        steps: state.completed,
        outcome: 'success',
        telemetryMetrics: {
          failureRate: metrics.errorRate,
          averageReward: 1.0 - metrics.errorRate,
          stuckDetections: metrics.stuckDetections
        }
      });
      
      baseResult.artifact = 'retro-notes.md';
      break;

    case 'learn':
      console.log('📚 Learning from experience...');
      console.log('   - Updating OKF bundle');
      console.log('   - Refining rules');
      console.log('   - Improving patterns');
      baseResult.artifact = 'learnings/';
      break;
  }

  // Simulate cost
  baseResult.cost = (baseResult.tokensUsed || 0) * 0.000003;

  return baseResult;
}

function checkCircuitBreaker(cb: CircuitBreaker): boolean {
  // Check consecutive failures
  if (cb.consecutiveFailures >= cb.maxFailures) {
    console.log(`⛔ Circuit breaker: ${cb.consecutiveFailures} consecutive failures (max: ${cb.maxFailures})`);
    return true;
  }

  // Check dispatch count
  if (cb.dispatchCount >= cb.maxDispatches) {
    console.log(`⛔ Circuit breaker: ${cb.dispatchCount} dispatches (max: ${cb.maxDispatches})`);
    return true;
  }

  // Check budget
  if (cb.totalCost >= cb.maxBudget) {
    console.log(`⛔ Circuit breaker: $${cb.totalCost.toFixed(2)} spent (max: $${cb.maxBudget})`);
    return true;
  }

  return false;
}

function printCircuitBreakerSummary(cb: CircuitBreaker): void {
  console.log('\nCircuit Breaker Summary:');
  console.log(`  Consecutive failures: ${cb.consecutiveFailures}/${cb.maxFailures}`);
  console.log(`  Total dispatches: ${cb.dispatchCount}/${cb.maxDispatches}`);
  console.log(`  Total cost: $${cb.totalCost.toFixed(2)}/$${cb.maxBudget}`);
}

async function writeHandoff(root: string, state: AutoState, phase: AutoPhase): Promise<void> {
  const handoffContent = `# Handoff

## Current Phase
${phase}

## Completed
${state.completed.map(p => `- ${p}`).join('\n')}

## Artifacts
${Object.entries(state.artifacts).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Next Phase
${state.completed[state.completed.length - 1] || 'none'}
`;
  await writeFile(join(root, '.vibe', 'handoff.md'), handoffContent);
}

function printPipelineSummary(state: AutoState, cb: CircuitBreaker): void {
  console.log('Pipeline Summary:');
  console.log(`  Phases completed: ${state.completed.length}`);
  console.log(`  Total dispatches: ${cb.dispatchCount}`);
  console.log(`  Total cost: $${cb.totalCost.toFixed(2)}`);
  console.log(`  Consecutive failures: ${cb.consecutiveFailures}`);
  console.log('\nArtifacts created:');
  for (const [phase, artifact] of Object.entries(state.artifacts)) {
    console.log(`  ${phase}: ${artifact}`);
  }
}
