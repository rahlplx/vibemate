// Vibemate Auto Command - Autonomous full pipeline with state machine
// Implements the /vibe:auto spec with 13 phases and circuit breakers
import { Command } from 'commander';
import { SelfImprovementOrchestrator } from '../evolve/index.js';
import { TelemetryCollector } from '../telemetry/collector.js';
import { CostAwareRouter } from '../router/index.js';
import { OKFGenerator } from '../okf/generator.js';
import { writeFile, readFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { AutoPhase, CircuitBreaker, AutoState, HarnessCheck, HarnessReport, PhaseObservation } from '../types.js';
import { applyAmbiguityGate, checkGovernancePermission, handleHarnessFailure, computeObservationScore } from './auto-helpers.js';
import { tokenBudgetGate, dlpGate, passRateGate } from './harness-gates.js';
import { buildCritiqueReport } from './critique-engine.js';
import { createObservationEngine } from '../improve/observation.js';
import { PromptRegistry } from '../prompts/registry.js';
import { loadConfig } from '../shared/config.js';
import type { ComposedPrompt } from '../types.js';
import { RequirementsTracker } from '../shared/requirements-tracker.js';
import { callLLM, buildPlanPrompt, buildBreakPrompt, buildDesignPrompt, parseLLMTasks, extractSection, type LLMCallerOverride } from './phase-helpers.js';

interface AutoOptions {
  budget?: number;
  maxFailures?: number;
  maxDispatches?: number;
  ui?: boolean;
}

const PHASE_TRANSITIONS: Record<AutoPhase, { next: AutoPhase | null; condition?: string }> = {
  think:     { next: 'plan' },
  plan:      { next: 'design', condition: 'has_ui' },
  design:    { next: 'break' },
  break:     { next: 'build' },
  build:     { next: 'critique', condition: 'has_more_tasks' },
  critique:  { next: 'harness', condition: 'critique_passed' },
  harness:   { next: 'review', condition: 'all_checks_passed' },
  review:    { next: 'qa', condition: 'has_ui' },
  qa:        { next: 'ship' },
  ship:      { next: 'retro' },
  retro:     { next: 'learn' },
  learn:     { next: 'done' },
  done:      { next: null }
};

const PHASE_EXECUTION: Record<AutoPhase, { skill: string; description: string }> = {
  think:     { skill: '/vibe:think',    description: 'Product strategy & design thinking' },
  plan:      { skill: '/vibe:plan',     description: 'Multi-perspective review' },
  design:    { skill: '/vibe:design',   description: 'UI generation & approval' },
  break:     { skill: '/vibe:break',    description: 'Milestone to task decomposition' },
  build:     { skill: '/vibe:build',    description: 'TDD execution with subagent dispatch' },
  critique:  { skill: '/vibe:critique', description: 'Cold-start adversarial code review — 5 lenses, minimum-findings floor' },
  harness:   { skill: '/vibe:harness',  description: 'Production readiness validation' },
  review:    { skill: '/vibe:review',   description: 'Multi-perspective code review' },
  qa:        { skill: '/vibe:qa',       description: 'Real browser QA testing' },
  ship:      { skill: '/vibe:ship',     description: 'Release engineering' },
  retro:     { skill: '/vibe:retro',    description: 'Retrospective & learning capture' },
  learn:     { skill: '/vibe:learn',    description: 'Self-improvement engine' },
  done:      { skill: '',               description: 'Pipeline complete' }
};

export function autoCommand(program: Command): void {
  program
    .command('auto')
    .description('Run autonomous full pipeline (Think → Build → Ship)')
    .argument('<description>', 'What to build')
    .option('-b, --budget <budget>', 'Maximum budget in USD', '10')
    .option('-f, --max-failures <n>', 'Max consecutive failures before stop', '3')
    .option('-d, --max-dispatches <n>', 'Max dispatches before stop', '10')
    .option('--ui', 'Enable UI phases (design, QA)')
    .action(async (description: string, options: AutoOptions) => {
      await runAutoPipeline(description, options);
    });
}

async function runAutoPipeline(description: string, options: AutoOptions): Promise<void> {
  console.log('🤖 Vibemate Auto Mode\n');
  console.log(`📝 Task: ${description}`);
  console.log(`💰 Budget: $${options.budget}`);
  console.log(`🔄 Max failures: ${options.maxFailures}`);
  console.log(`📊 Max dispatches: ${options.maxDispatches}`);
  console.log(`🎨 UI mode: ${options.ui ? 'enabled' : 'disabled'}\n`);

  const root = process.cwd();
  const vibeDir = join(root, '.vibe');

  const okfGenerator = new OKFGenerator(root);
  const telemetryCollector = new TelemetryCollector({
    enabled: true,
    exportDir: join(vibeDir, 'telemetry'),
    serviceName: 'vibemate-auto',
    serviceVersion: '1.0.0'
  });
  const selfImprovement = new SelfImprovementOrchestrator(okfGenerator, { vibeDir });
  await selfImprovement.init();
  const observationEngine = createObservationEngine(join(vibeDir, 'state.db'));
  const router = new CostAwareRouter([], parseFloat(String(options.budget || '10')), undefined, observationEngine);

  const circuitBreaker: CircuitBreaker = {
    consecutiveFailures: 0,
    dispatchCount: 0,
    totalCost: 0,
    maxFailures: parseInt(String(options.maxFailures || '3'), 10),
    maxDispatches: parseInt(String(options.maxDispatches || '10'), 10),
    maxBudget: parseFloat(String(options.budget || '10'))
  };

  let state: AutoState = {
    phase: 'think',
    step: '',
    completed: [],
    agent: 'claude-code',
    hasUI: options.ui || false,
    mode: 'auto',
    telemetry: true,
    artifacts: {}
  };

  // ─── Prompt composition ──────────────────────────────────────────────────────
  const vmConfig = loadConfig(root);
  const promptRegistryPath = join(vibeDir, 'prompts', 'registry.json');
  let promptRegistry: PromptRegistry;
  try {
    promptRegistry = PromptRegistry.fromJSON(JSON.parse(await readFile(promptRegistryPath, 'utf-8')));
  } catch {
    promptRegistry = new PromptRegistry();
  }
  const composedPrompt = promptRegistry.compose({
    activeRoleIds: vmConfig.promptRoles ?? [],
    systemPrompt: vmConfig.systemPrompt,
    phasePrompts: vmConfig.phasePrompts,
  });
  if (composedPrompt.activeTemplateIds.length > 0) {
    console.log(`🧠 Active prompt roles: ${composedPrompt.activeTemplateIds.join(', ')}`);
  }
  // Persist composed prompt so skill files and handoffs can read it
  await mkdir(join(vibeDir, 'prompts'), { recursive: true });
  await writeFile(join(vibeDir, 'prompts', 'active.json'), JSON.stringify(composedPrompt, null, 2));

  const statePath = join(vibeDir, 'state.json');
  try {
    const existingState = await readFile(statePath, 'utf-8');
    state = JSON.parse(existingState);
    console.log(`📂 Resuming from phase: ${state.phase}\n`);
  } catch (error) {
    console.error(`[Auto] Failed to read existing state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    await mkdir(vibeDir, { recursive: true });
    await writeFile(statePath, JSON.stringify(state, null, 2));
  }

  while (state.phase !== 'done') {
    if (checkCircuitBreaker(circuitBreaker)) {
      console.log('\n⚠️  Circuit breaker triggered!\n');
      printCircuitBreakerSummary(circuitBreaker);
      break;
    }

    // Governance gate: check permission before executing each phase
    const agentRole = state.agentId ?? 'developer';
    if (!checkGovernancePermission(agentRole, state.phase)) {
      console.error(`\n🚫 Governance: execution of phase "${state.phase}" denied by policy`);
      break;
    }

    const phaseInfo = PHASE_EXECUTION[state.phase];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Phase: ${state.phase.toUpperCase()}`);
    console.log(`📋 ${phaseInfo.description}`);
    console.log(`🔧 Skill: ${phaseInfo.skill || 'N/A'}`);
    console.log(`${'='.repeat(60)}\n`);

    // Route: select model tier for this phase using phase default + previous observation score
    const prevObsScore = state.observations?.at(-1)?.observationScore;
    const routingDecision = router.route({
      filesImplicated: 2,
      requiresReasoning: state.phase === 'think' || state.phase === 'review',
      testOutputSize: 0,
      hasDependencies: false,
      isRefactoring: false,
      requiresSecurity: false,
      phase: state.phase,
      observationScore: prevObsScore,
    });
    console.log(`🤖 Model tier: ${routingDecision.level} (${routingDecision.model}) — ${routingDecision.reason}`);

    const startTime = performance.now();
    // Build phase-specific composed prompt
    const phaseComposed = promptRegistry.compose({
      activeRoleIds: vmConfig.promptRoles ?? [],
      systemPrompt: vmConfig.systemPrompt,
      phasePrompts: vmConfig.phasePrompts,
      phase: state.phase,
    });
    const result = await executePhase(state.phase, state, {
      description,
      root,
      okfGenerator,
      telemetryCollector,
      selfImprovement,
      router,
      circuitBreaker,
      routingDecision,
      composedPrompt: phaseComposed,
    });
    const duration = Math.round(performance.now() - startTime);

    const justCompleted = state.phase;
    state.completed.push(state.phase);
    state.artifacts[state.phase] = result.artifact || '';

    // Record prompt outcome for evolver and persist so stats survive restarts
    const phaseOutcome = result.allChecksPassed === false ? 'failure' : 'success';
    promptRegistry.recordOutcome(phaseComposed.activeTemplateIds, justCompleted, phaseOutcome, duration);
    await writeFile(promptRegistryPath, JSON.stringify(promptRegistry.toJSON(), null, 2));

    // Ambiguity gate: after BREAK, check if task scope is clear enough to proceed
    if (justCompleted === 'break' && result.ambiguity) {
      applyAmbiguityGate(result.ambiguity, circuitBreaker);
    }

    if (result.allChecksPassed === false && state.phase === 'harness') {
      const shouldRetry = handleHarnessFailure(state, circuitBreaker);
      if (shouldRetry) {
        console.log('⚠️  HARNESS failed — retrying build with simpler model');
        state.phase = 'build';
        await writeFile(statePath, JSON.stringify(state, null, 2));
        continue;
      }
    } else if (result.allChecksPassed === false) {
      circuitBreaker.consecutiveFailures++;
    } else {
      circuitBreaker.consecutiveFailures = 0;
    }

    // Telemetry quality gates: loop detection + anomaly detection
    if (state.telemetry) {
      const loopReport = telemetryCollector.detectLoop();
      const anomalies = telemetryCollector.getAnomalies();
      // Clear window so the same anomalies don't re-trigger on the next phase
      telemetryCollector.flushAnomalyWindow();

      if (loopReport.detected && loopReport.severity === 'rapid') {
        console.log(`\n⚠️  Telemetry: rapid tool loop detected (${loopReport.cycle.join('→')})`);
        circuitBreaker.consecutiveFailures++;
      }
      if (anomalies.some(a => a.severity === 'critical')) {
        console.log(`\n⚠️  Telemetry: critical anomaly detected (${anomalies.filter(a => a.severity === 'critical').map(a => a.type).join(', ')})`);
        circuitBreaker.consecutiveFailures++;
      }
    }

    // M3: Capture per-phase observation and feed score into next routing decision
    const phaseErrorCount = result.allChecksPassed === false ? 1 : 0;
    const observationScore = computeObservationScore(phaseErrorCount, duration, circuitBreaker.consecutiveFailures);
    const obsSessionId = state.sessionId ?? `auto-${justCompleted}`;
    const observationId = observationEngine.recordObservation(obsSessionId, {
      type: phaseErrorCount > 0 ? 'failure' : 'success',
      description: `Phase ${justCompleted} completed in ${duration}ms`,
      lesson: phaseErrorCount > 0 ? `Phase ${justCompleted} had errors; consider escalating model tier` : `Phase ${justCompleted} succeeded`,
      tags: ['phase-observation', justCompleted],
      confidence: observationScore,
    });
    const phaseObservation: PhaseObservation = {
      phase: justCompleted,
      durationMs: duration,
      tokenCost: 0,
      errorCount: phaseErrorCount,
      circuitBreakerState: {
        consecutiveFailures: circuitBreaker.consecutiveFailures,
        dispatchCount: circuitBreaker.dispatchCount,
        totalCost: circuitBreaker.totalCost,
      },
      observationScore,
      timestamp: new Date().toISOString(),
      observationId,
    };
    if (!state.observations) state.observations = [];
    state.observations.push(phaseObservation);

    const transition = PHASE_TRANSITIONS[state.phase];
    if (transition.next) {
      if (transition.condition === 'has_ui' && !state.hasUI) {
        console.log(`⏭️  Skipping ${transition.next} (no UI)`);
        const skipTransition = PHASE_TRANSITIONS[transition.next];
        state.phase = skipTransition?.next ?? transition.next;
      } else if (transition.condition === 'has_more_tasks' && result.hasMoreTasks) {
        state.phase = justCompleted;
      } else if (transition.condition === 'critique_passed' && !result.allChecksPassed) {
        console.log('🔄 Critique found blocking issues — looping back to build');
        state.phase = 'build';
      } else if (transition.condition === 'all_checks_passed' && !result.allChecksPassed) {
        console.log('🔄 Harness checks failed, looping...');
      } else {
        state.phase = transition.next;
      }
    } else {
      state.phase = 'done';
    }

    await writeFile(statePath, JSON.stringify(state, null, 2));
    await writeHandoff(root, state, justCompleted);
    circuitBreaker.dispatchCount++;

    if (state.telemetry) {
      await telemetryCollector.recordAgentTurn(
        `auto-${justCompleted}`,
        'vibemate',
        0,
        0,
        0,
        { phase: justCompleted, agentType: process.env.VIBEMATE_AGENT_TYPE ?? state.agent }
      );
    }

    console.log(`\n⏱️  Phase ${justCompleted} completed in ${duration}ms`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Pipeline Complete!');
  console.log('='.repeat(60));
  printPipelineSummary(state, circuitBreaker);
}

async function executePhase(
  phase: AutoPhase,
  state: AutoState,
  context: {
    description: string;
    root: string;
    okfGenerator: OKFGenerator;
    telemetryCollector: TelemetryCollector;
    selfImprovement: SelfImprovementOrchestrator;
    router: CostAwareRouter;
    circuitBreaker: CircuitBreaker;
    routingDecision?: import('../types.js').RoutingDecision;
    composedPrompt?: ComposedPrompt;
    llmCaller?: LLMCallerOverride;
  }
): Promise<{ artifact?: string; hasMoreTasks?: boolean; allChecksPassed?: boolean; ambiguity?: import('../discovery/scoring.js').AmbiguityResult }> {
  const { root, selfImprovement, circuitBreaker } = context;
  const vibeDir = join(root, '.vibe');

  switch (phase) {
    case 'think': {
      console.log('💭 Analyzing requirements...');

      // Consult past learnings before designing — close the feedback loop
      const advisory = await selfImprovement.advise(context.description);
      const guidanceSection = advisory.guidance
        ? `\n## Past Learnings Advisory\n${advisory.guidance}\n`
        : '';

      const systemPromptSection = context.composedPrompt?.systemPrompt
        ? `\n## Active System Context\n> ${context.composedPrompt.systemPrompt.replace(/\n/g, '\n> ')}\n`
        : '';

      const designDoc = `# Design Document

## Task
${context.description}
${guidanceSection}${systemPromptSection}
## Requirements
- [ ] Core functionality implemented
- [ ] Error handling comprehensive
- [ ] Tests written and passing
- [ ] Documentation complete

## Success Metrics
- All tests passing (bun test)
- Type check clean (tsc --noEmit)
- No lint errors
- Test coverage >80%

## Scope Boundaries
### In Scope
- Core feature implementation
- Unit and integration tests
- Documentation

### Out of Scope
- Performance optimization (deferred)
- Multi-language support (deferred)

## Technical Constraints
- Runtime: Bun primary
- Database: SQLite via bun:sqlite
- Testing: bun:test
- Language: TypeScript strict mode

## Architecture Decisions
Reference OKF bundle for pre-populated decisions.
`;
      await writeFile(join(vibeDir, 'design-doc.md'), designDoc);

      // Seed MoSCoW requirements from design doc — persist so `vibemate requirements list` works
      const reqFile = join(vibeDir, 'requirements.json');
      let reqTracker: RequirementsTracker;
      try {
        const existing = await readFile(reqFile, 'utf-8');
        reqTracker = RequirementsTracker.fromJSON(JSON.parse(existing));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes('ENOENT') || msg.includes('no such file')) {
          reqTracker = new RequirementsTracker();
        } else {
          throw e;
        }
      }
      // Only seed if no requirements yet — avoid overwriting user-curated list
      if (reqTracker.list().length === 0) {
        reqTracker.add({ tier: 'must', title: 'Core functionality implemented', rationale: 'Product has no value without its primary capability.', persona: 'product-owner', context: 'THINK', source: 'llm-inferred', tags: ['core'], status: 'active' });
        reqTracker.add({ tier: 'must', title: 'Error handling at system boundaries', rationale: 'Unhandled errors propagate to users; all external I/O must be guarded.', persona: 'developer', context: 'THINK', source: 'evidence', tags: ['reliability'], status: 'active' });
        reqTracker.add({ tier: 'must', title: 'Tests written and passing', rationale: 'Evidence: Standish CHAOS 2020 — untested code has 3× higher production defect rate.', persona: 'tdd-practitioner', context: 'THINK', source: 'evidence', tags: ['testing', 'quality'], status: 'active' });
        reqTracker.add({ tier: 'should', title: 'TypeScript strict mode compliance', rationale: 'Catches class of runtime errors at compile time; reduces production incidents.', persona: 'typescript-engineer', context: 'THINK', source: 'evidence', tags: ['typescript', 'types'], status: 'active' });
        reqTracker.add({ tier: 'should', title: 'Test coverage >80%', rationale: 'Industry threshold for confidence in change safety (Google SWE Book).', persona: 'tdd-practitioner', context: 'THINK', source: 'evidence', tags: ['coverage', 'testing'], status: 'active' });
        reqTracker.add({ tier: 'should', title: 'OKF architectural decisions documented', rationale: 'Decisions made without documentation are re-litigated; OKF closes the feedback loop.', persona: 'developer', context: 'THINK', source: 'llm-inferred', tags: ['okf', 'docs'], status: 'active' });
        reqTracker.add({ tier: 'could', title: 'Performance benchmarks established', rationale: 'Useful for regressions but not blocking initial delivery.', persona: 'developer', context: 'THINK', source: 'llm-inferred', tags: ['performance'], status: 'active' });
        reqTracker.add({ tier: 'wont', title: 'Multi-language i18n support', rationale: 'Out of scope for this iteration — would add significant complexity without current user demand.', persona: 'product-owner', context: 'THINK', source: 'user', tags: ['i18n'], status: 'active' });
        await writeFile(reqFile, JSON.stringify(reqTracker.toJSON(), null, 2));
        await writeFile(join(vibeDir, 'requirements.md'), reqTracker.toMarkdown());
      }

      return { artifact: 'design-doc.md' };
    }

    case 'plan': {
      console.log('📋 Creating task plan...');

      // Read design doc from THINK phase as context
      let designDoc = '';
      try { designDoc = await readFile(join(vibeDir, 'design-doc.md'), 'utf-8'); } catch { /* no design doc yet */ }

      const model = context.routingDecision?.model ?? 'claude-sonnet-4-20250514';
      const provider = context.routingDecision?.provider ?? 'anthropic';
      const systemCtx = context.composedPrompt?.systemPrompt
        ? `You are a senior engineer. ${context.composedPrompt.systemPrompt}`
        : 'You are a senior engineering lead creating precise, actionable task plans.';

      const llmResponse = await callLLM(
        model, provider,
        systemCtx,
        buildPlanPrompt(context.description, designDoc),
        4096,
        context.llmCaller,
      );

      // Extract markdown plan section and write task-plan.md
      const markdownPlan = extractSection(llmResponse, 'MARKDOWN_PLAN') || llmResponse;
      await writeFile(join(vibeDir, 'task-plan.md'), markdownPlan.startsWith('#')
        ? markdownPlan
        : `# Task Plan\n\n${markdownPlan}`);

      // Extract and parse tasks.json — fall back to a minimal scaffold on parse failure
      const tasks = parseLLMTasks(llmResponse);
      const tasksObj = tasks.length > 0 ? { tasks } : {
        tasks: [
          { id: 'task-1', title: 'Set up project structure', description: 'Create directory structure and base files', milestone: 'M1', complexityScore: 2, executionMode: 'inline', acceptanceCriteria: ['Directories exist', 'Base files created'], dependencies: [], files: [] },
          { id: 'task-2', title: 'Implement core logic', description: context.description, milestone: 'M1', complexityScore: 8, executionMode: 'session', acceptanceCriteria: ['Core function works', 'Edge cases handled'], dependencies: ['task-1'], files: [] },
          { id: 'task-3', title: 'Add tests', description: 'Write unit and integration tests', milestone: 'M2', complexityScore: 5, executionMode: 'inline', acceptanceCriteria: ['All tests pass', 'Coverage >80%'], dependencies: ['task-2'], files: [] },
        ]
      };
      await writeFile(join(vibeDir, 'tasks.json'), JSON.stringify(tasksObj, null, 2));
      console.log(`   📋 Generated ${tasksObj.tasks.length} tasks`);
      return { artifact: 'task-plan.md' };
    }

    case 'design': {
      console.log('🎨 Generating UI design...');
      await mkdir(join(vibeDir, 'design'), { recursive: true });

      let designDoc = '';
      try { designDoc = await readFile(join(vibeDir, 'design-doc.md'), 'utf-8'); } catch { /* ok */ }

      const model = context.routingDecision?.model ?? 'claude-sonnet-4-20250514';
      const provider = context.routingDecision?.provider ?? 'anthropic';
      const systemCtx = context.composedPrompt?.systemPrompt
        ? `You are a UI/UX designer. ${context.composedPrompt.systemPrompt}`
        : 'You are a UI/UX designer producing clear wireframe specifications for developers.';

      const llmResponse = await callLLM(
        model, provider,
        systemCtx,
        buildDesignPrompt(context.description, designDoc),
        4096,
        context.llmCaller,
      );

      const wireframes = extractSection(llmResponse, 'WIREFRAMES') || llmResponse;
      const components = extractSection(llmResponse, 'COMPONENTS') || '# Components\n\nSee wireframes for component structure.';

      await writeFile(join(vibeDir, 'design', 'wireframes.md'), `# Wireframes\n\n${wireframes}`);
      await writeFile(join(vibeDir, 'design', 'components.md'), `# Components\n\n${components}`);
      return { artifact: 'design/' };
    }

    case 'break': {
      console.log('🔨 Breaking down tasks into atomic units...');

      let taskPlan = '';
      try { taskPlan = await readFile(join(vibeDir, 'task-plan.md'), 'utf-8'); } catch { /* ok */ }

      const model = context.routingDecision?.model ?? 'claude-sonnet-4-20250514';
      const provider = context.routingDecision?.provider ?? 'anthropic';
      const systemCtx = context.composedPrompt?.systemPrompt
        ? `You are a senior engineer. ${context.composedPrompt.systemPrompt}`
        : 'You are a senior engineer decomposing milestones into atomic, implementable tasks.';

      const llmResponse = await callLLM(
        model, provider,
        systemCtx,
        buildBreakPrompt(context.description, taskPlan),
        4096,
        context.llmCaller,
      );

      const tasks = parseLLMTasks(llmResponse);
      if (tasks.length > 0) {
        // Merge with existing tasks.json if it exists — replace with LLM-refined list
        await writeFile(join(vibeDir, 'tasks.json'), JSON.stringify({ tasks }, null, 2));
        console.log(`   🔨 Decomposed into ${tasks.length} atomic tasks`);
      } else {
        console.log('   ℹ️  Using task plan from PLAN phase (LLM parse returned empty)');
      }

      return { artifact: 'tasks.json' };
    }

    case 'build': {
      console.log('🏗️  Building...');
      const buildResult = await runBuild(root);
      return { artifact: 'build-output.log', hasMoreTasks: buildResult.hasMoreTasks };
    }

    case 'critique': {
      console.log('🔬 Running adversarial critique (5 lenses)...');
      let sourceCode = '';
      let testCode = '';
      try {
        sourceCode = await gatherTsFiles(join(root, 'src'));
        testCode = await gatherTsFiles(join(root, 'tests'));
      } catch (e) {
        console.error('[Critique] Failed to gather source/test files:', e instanceof Error ? e.message : String(e));
      }

      const critiqueReport = buildCritiqueReport(sourceCode, testCode);
      await writeFile(join(vibeDir, 'critique-report.json'), JSON.stringify(critiqueReport, null, 2));

      console.log(`\n   📊 Critique score: ${critiqueReport.score} — verdict: ${critiqueReport.verdict.toUpperCase()}`);
      for (const f of critiqueReport.findings) {
        const icon = f.severity === 'critical' ? '🚨' : f.severity === 'high' ? '⚠️ ' : f.severity === 'medium' ? '🔶' : 'ℹ️ ';
        const synth = f.category === 'synthetic' ? ' [probe]' : '';
        console.log(`   ${icon} [${f.lens}]${synth} ${f.message}`);
      }

      if (critiqueReport.blocksHarness) {
        console.log(`\n   🚫 Critique BLOCKS harness — fix critical findings before proceeding`);
      } else {
        console.log(`\n   ✅ Critique passed — proceeding to harness`);
      }

      return {
        artifact: 'critique-report.json',
        allChecksPassed: !critiqueReport.blocksHarness,
      };
    }

    case 'harness': {
      console.log('🔍 Running harness checks...');
      const harnessResult = await runHarnessChecks(root, circuitBreaker);
      await writeFile(join(vibeDir, 'harness-report.json'), JSON.stringify(harnessResult, null, 2));
      return { artifact: 'harness-report.json', allChecksPassed: harnessResult.overall === 'pass' };
    }

    case 'review': {
      console.log('👁️  Running code review...');
      const reviewReport = await runCodeReview(root);
      await writeFile(join(vibeDir, 'review-report.md'), reviewReport);
      return { artifact: 'review-report.md' };
    }

    case 'qa': {
      console.log('🧪 Running QA...');
      await mkdir(join(vibeDir, 'qa'), { recursive: true });

      // Run the test suite as the primary QA signal
      let passed = 0;
      let failed = 0;
      let testOutput = '';
      let testStatus: 'PASS' | 'FAIL' | 'ERROR' = 'PASS';

      const qaStart = performance.now();
      try {
        console.log('   🧪 Running test suite...');
        testOutput = execFileSync('bun', ['test'], {
          cwd: root,
          encoding: 'utf-8',
          timeout: 120000,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        const passMatch = testOutput.match(/(\d+) pass/);
        const failMatch = testOutput.match(/(\d+) fail/);
        passed = passMatch ? parseInt(passMatch[1]) : 0;
        failed = failMatch ? parseInt(failMatch[1]) : 0;
        testStatus = failed > 0 ? 'FAIL' : 'PASS';
        console.log(`   ${testStatus === 'PASS' ? '✅' : '❌'} Tests: ${passed} pass, ${failed} fail`);
      } catch (e: unknown) {
        const err = e as { stderr?: string; stdout?: string };
        const combined = (err.stdout || '') + '\n' + (err.stderr || '');
        const passMatch = combined.match(/(\d+) pass/);
        const failMatch = combined.match(/(\d+) fail/);
        passed = passMatch ? parseInt(passMatch[1]) : 0;
        failed = failMatch ? parseInt(failMatch[1]) : 0;
        testOutput = combined.slice(0, 2000);
        testStatus = 'FAIL';
        console.log(`   ❌ Tests: ${passed} pass, ${failed} fail`);
      }
      const qaDurationMs = Math.round(performance.now() - qaStart);

      const qaReport = `# QA Report

## Status: ${testStatus}

## Test Suite Results
- **Tests passed:** ${passed}
- **Tests failed:** ${failed}
- **Duration:** ${qaDurationMs}ms
- **Timestamp:** ${new Date().toISOString()}

## Checks
${testStatus === 'PASS' ? '- [x]' : '- [ ]'} Test suite ${testStatus === 'PASS' ? 'passed' : 'failed'} (${passed} pass / ${failed} fail)
- [${state.hasUI ? 'x' : '-'}] UI mode: ${state.hasUI ? 'enabled' : 'disabled (skipped browser QA)'}

## Test Output (last 2000 chars)
\`\`\`
${testOutput.slice(-2000).trim()}
\`\`\`

## Notes
${testStatus === 'PASS'
  ? 'All automated tests passing. QA phase complete.'
  : `${failed} test(s) failing. Review the output above and fix failures before shipping.`}
`;
      await writeFile(join(vibeDir, 'qa-report.md'), qaReport);
      return { artifact: 'qa-report.md', allChecksPassed: testStatus === 'PASS' };
    }

    case 'ship': {
      console.log('🚢 Shipping...');
      await runShip(root);
      circuitBreaker.totalCost += 0.01;
      return { artifact: 'pr-link.md' };
    }

    case 'retro': {
      console.log('📝 Running retrospective...');
      await selfImprovement.improve({
        taskId: `auto-${Date.now()}`,
        steps: state.completed,
        outcome: 'success'
      });
      const retroNotes = `# Retrospective

## Completed Phases
${state.completed.map(p => `- ${p}`).join('\n')}

## Artifacts Created
${Object.entries(state.artifacts).map(([p, a]) => `- ${p}: ${a}`).join('\n')}

## Metrics
- Total dispatches: ${circuitBreaker.dispatchCount}
- Total cost: $${circuitBreaker.totalCost.toFixed(2)}
- Consecutive failures: ${circuitBreaker.consecutiveFailures}
`;
      await writeFile(join(vibeDir, 'retro-notes.md'), retroNotes);
      return { artifact: 'retro-notes.md' };
    }

    case 'learn': {
      console.log('📚 Learning from experience...');
      const learnAdvisory = await selfImprovement.advise(context.description);
      const learningsDoc = `# Learnings

## Best Principle
${learnAdvisory.bestPrinciple}

## Recommended Approach for Similar Tasks
${learnAdvisory.selectedSkill.action}

## Top Lessons from Past Work
${learnAdvisory.relevantLessons.length > 0
  ? learnAdvisory.relevantLessons.map(l => `- [${l.type}] ${l.lesson}`).join('\n')
  : '- No relevant past lessons yet.'}
`;
      await writeFile(join(vibeDir, 'learnings.md'), learningsDoc);
      return { artifact: 'learnings.md' };
    }

    default:
      return {};
  }
}

async function gatherTsFiles(dir: string): Promise<string> {
  let content = '';
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        content += await gatherTsFiles(fullPath);
      } else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.endsWith('.d.ts')) {
        try { content += '\n' + await readFile(fullPath, 'utf-8'); } catch { /* skip unreadable */ }
      }
    }
  } catch { /* dir doesn't exist */ }
  return content;
}

async function runBuild(root: string): Promise<{ hasMoreTasks: boolean }> {
  const log: string[] = [];

  try {
    console.log('   🔧 Running type check...');
    const tscOutput = execFileSync('npx', ['tsc', '--noEmit'], {
      cwd: root,
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    log.push(`TypeCheck: PASS\n${tscOutput}`);
    console.log('   ✅ Type check passed');
  } catch (e: unknown) {
    const error = e as { stderr?: string; stdout?: string; message?: string };
    log.push(`TypeCheck: FAIL\n${error.stderr || error.stdout || error.message || 'Unknown error'}`);
    console.log('   ❌ Type check failed');
  }

  try {
    console.log('   🧪 Running tests...');
    const testOutput = execFileSync('bun', ['test'], {
      cwd: root,
      encoding: 'utf-8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    log.push(`\nTests: PASS\n${testOutput}`);
    console.log('   ✅ Tests passed');
  } catch (e: unknown) {
    const error = e as { stderr?: string; stdout?: string; message?: string };
    log.push(`\nTests: FAIL\n${error.stderr || error.stdout || error.message || 'Unknown error'}`);
    console.log('   ❌ Tests failed');
  }

  const logPath = join(root, '.vibe', 'build-output.log');
  await writeFile(logPath, log.join('\n'));

  return { hasMoreTasks: false };
}

async function runHarnessChecks(root: string, circuitBreaker: CircuitBreaker): Promise<HarnessReport> {
  const checks: HarnessCheck[] = [];

  // Type check
  const tscStart = performance.now();
  try {
    execFileSync('npx', ['tsc', '--noEmit'], {
      cwd: root,
      encoding: 'utf-8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    checks.push({
      name: 'Type Check',
      status: 'pass',
      message: 'No type errors',
      duration: Math.round(performance.now() - tscStart)
    });
    console.log('   ✅ Type Check');
  } catch (error) {
    console.error(`[Auto] Type check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    checks.push({
      name: 'Type Check',
      status: 'fail',
      message: 'Type errors found',
      duration: Math.round(performance.now() - tscStart)
    });
    console.log('   ❌ Type Check');
  }

  // Tests — capture pass/fail counts for pass rate gate
  const testStart = performance.now();
  try {
    const output = execFileSync('bun', ['test'], {
      cwd: root,
      encoding: 'utf-8',
      timeout: 120000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const passMatch = output.match(/(\d+) pass/);
    const failMatch = output.match(/(\d+) fail/);
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    const total = passed + failed;
    checks.push({
      name: 'Unit Tests',
      status: 'pass',
      message: `${passed} tests passing`,
      duration: Math.round(performance.now() - testStart)
    });
    console.log(`   ✅ Unit Tests (${passed} passing)`);
    // Pass rate gate
    const rateCheck = passRateGate(passed, total);
    checks.push(rateCheck);
    console.log(`   ${rateCheck.status === 'pass' ? '✅' : rateCheck.status === 'warn' ? '⚠️ ' : '❌'} ${rateCheck.name}: ${rateCheck.message}`);
  } catch (error) {
    const errStdout = error instanceof Error && 'stdout' in error ? String((error as NodeJS.ErrnoException & { stdout?: string }).stdout || '') : '';
    const errStderr = error instanceof Error && 'stderr' in error ? String((error as NodeJS.ErrnoException & { stderr?: string }).stderr || '') : '';
    const combinedOutput = errStdout + '\n' + errStderr;
    const passMatch = combinedOutput.match(/(\d+) pass/);
    const failMatch = combinedOutput.match(/(\d+) fail/);
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    checks.push({
      name: 'Unit Tests',
      status: 'fail',
      message: 'Tests failing',
      duration: Math.round(performance.now() - testStart)
    });
    console.log('   ❌ Unit Tests');
    const rateCheck = passRateGate(passed, passed + failed);
    checks.push(rateCheck);
    console.log(`   ❌ ${rateCheck.name}: ${rateCheck.message}`);
  }

  // Token budget gate
  const budgetCheck = tokenBudgetGate(circuitBreaker.totalCost, circuitBreaker.maxBudget);
  checks.push(budgetCheck);
  console.log(`   ${budgetCheck.status === 'pass' ? '✅' : budgetCheck.status === 'warn' ? '⚠️ ' : budgetCheck.status === 'skip' ? '⏭️ ' : '❌'} ${budgetCheck.name}: ${budgetCheck.message}`);

  // DLP gate — scan handoff doc for unmasked secrets
  const handoffPath = join(root, '.vibe', 'handoff.md');
  let handoffContent = '';
  try {
    handoffContent = await readFile(handoffPath, 'utf-8');
  } catch { /* no handoff doc yet — scan empty string */ }
  const dlpCheck = dlpGate(handoffContent);
  checks.push(dlpCheck);
  console.log(`   ${dlpCheck.status === 'pass' ? '✅' : '❌'} ${dlpCheck.name}: ${dlpCheck.message}`);

  // Lint (if eslint config exists)
  const lintStart = performance.now();
  if (existsSync(join(root, '.eslintrc.js')) || existsSync(join(root, '.eslintrc.json')) || existsSync(join(root, 'eslint.config.js'))) {
    try {
      execFileSync('npx', ['eslint', 'src/'], {
        cwd: root,
        encoding: 'utf-8',
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      checks.push({
        name: 'Lint',
        status: 'pass',
        message: 'No lint errors',
        duration: Math.round(performance.now() - lintStart)
      });
      console.log('   ✅ Lint');
    } catch (error) {
      console.error(`[Auto] Lint check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      checks.push({
        name: 'Lint',
        status: 'warn',
        message: 'Lint issues found',
        duration: Math.round(performance.now() - lintStart)
      });
      console.log('   ⚠️  Lint (warnings)');
    }
  } else {
    checks.push({
      name: 'Lint',
      status: 'skip',
      message: 'No eslint config found',
      duration: 0
    });
    console.log('   ⏭️  Lint (skipped - no config)');
  }

  const pass = checks.filter(c => c.status === 'pass').length;
  const fail = checks.filter(c => c.status === 'fail').length;
  const warn = checks.filter(c => c.status === 'warn').length;
  const skip = checks.filter(c => c.status === 'skip').length;

  return {
    timestamp: new Date().toISOString(),
    checks,
    pass,
    fail,
    warn,
    skip,
    overall: fail > 0 ? 'fail' : 'pass'
  };
}

async function runCodeReview(root: string): Promise<string> {
  const issues: string[] = [];

  // Check for common issues
  try {
    const srcDir = join(root, 'src');
    if (existsSync(srcDir)) {
      const { readdirSync, readFileSync } = await import('fs');
      const files = readdirSync(srcDir, { recursive: true, withFileTypes: true })
        .filter(f => f.isFile() && f.name.endsWith('.ts'))
        .map(f => join(f.parentPath || f.path, f.name));

      for (const file of files) {
        const content = readFileSync(file, 'utf-8');
        const relPath = file.replace(root + '\\', '');

        // Check for console.log in production code
        if (content.includes('console.log') && !relPath.includes('cli/')) {
          issues.push(`⚠️  ${relPath}: Contains console.log (consider using telemetry)`);
        }

        // Check for TODO/FIXME
        const todos = content.match(/(TODO|FIXME|HACK|XXX)/g);
        if (todos) {
          issues.push(`📝 ${relPath}: Contains ${todos.length} TODO/FIXME comments`);
        }

        // Check for any type
        const anyCount = (content.match(/: any/g) || []).length;
        if (anyCount > 0) {
          issues.push(`⚠️  ${relPath}: Uses 'any' type ${anyCount} times`);
        }
      }
    }
  } catch (error) {
    console.error(`[Auto] Code review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    issues.push('⚠️  Could not perform full code review');
  }

  return `# Code Review Report

## Status: ${issues.length === 0 ? 'PASS' : 'WARNINGS'}

## Findings
${issues.length === 0 ? 'No issues found.' : issues.join('\n')}

## Summary
- Issues found: ${issues.length}
- Critical: 0
- Warnings: ${issues.length}
`;
}

async function runShip(root: string): Promise<{ prLink: string }> {
  const log: string[] = [];

  try {
    // Check if git is initialized
    execFileSync('git', ['status'], { cwd: root, stdio: ['pipe'] });
    log.push('Git: initialized');

    // Stage changes
    try {
      execFileSync('git', ['add', '-A'], { cwd: root, stdio: ['pipe'] });
      log.push('Git: staged all changes');
    } catch (error) {
      console.error(`[Auto] Git add failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      log.push('Git: no changes to stage');
    }

    // Check if there are changes to commit
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd: root,
      encoding: 'utf-8',
      stdio: ['pipe']
    });

    if (status.trim()) {
      // Create commit
      execFileSync('git', ['commit', '-m', 'feat: auto-pipeline implementation'], {
        cwd: root,
        stdio: ['pipe']
      });
      log.push('Git: committed changes');
    } else {
      log.push('Git: no changes to commit');
    }
  } catch (error) {
    console.error(`[Auto] Git operations failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    log.push('Git: not initialized or error');
  }

  return { prLink: '' };
}

function checkCircuitBreaker(cb: CircuitBreaker): boolean {
  if (cb.consecutiveFailures >= cb.maxFailures) {
    console.log(`\n❌ Circuit breaker: ${cb.consecutiveFailures} consecutive failures`);
    return true;
  }
  if (cb.dispatchCount >= cb.maxDispatches) {
    console.log(`\n❌ Circuit breaker: ${cb.dispatchCount} dispatches reached`);
    return true;
  }
  if (cb.totalCost >= cb.maxBudget) {
    console.log(`\n❌ Circuit breaker: $${cb.totalCost.toFixed(2)} budget exceeded`);
    return true;
  }
  return false;
}

function printCircuitBreakerSummary(cb: CircuitBreaker): void {
  console.log('\n📊 Circuit Breaker Summary:');
  console.log(`   Consecutive failures: ${cb.consecutiveFailures}/${cb.maxFailures}`);
  console.log(`   Dispatch count: ${cb.dispatchCount}/${cb.maxDispatches}`);
  console.log(`   Total cost: $${cb.totalCost.toFixed(2)}/$${cb.maxBudget.toFixed(2)}`);
}

async function writeHandoff(root: string, state: AutoState, justCompleted: AutoPhase): Promise<void> {
  const nextPhase = state.phase;
  const handoff = `# Handoff Document

## Current State
- Completed Phase: ${justCompleted}
- Current Phase: ${nextPhase}
- All Completed: ${state.completed.join(', ')}

## Artifacts
${Object.entries(state.artifacts).map(([phase, artifact]) => `- ${phase}: ${artifact}`).join('\n')}

## Context
- Has UI: ${state.hasUI}
- Mode: ${state.mode}
- Agent: ${state.agent}

## Next Steps
Execute ${PHASE_EXECUTION[nextPhase]?.description || 'complete'} using ${PHASE_EXECUTION[nextPhase]?.skill || 'N/A'}
`;
  await writeFile(join(root, '.vibe', 'handoff.md'), handoff);
}

function printPipelineSummary(state: AutoState, cb: CircuitBreaker): void {
  console.log('\n📋 Pipeline Summary:');
  console.log(`   Completed phases: ${state.completed.join(' → ')}`);
  console.log(`   Final phase: ${state.phase}`);
  console.log(`   Total dispatches: ${cb.dispatchCount}`);
  console.log(`   Total cost: $${cb.totalCost.toFixed(2)}`);
  console.log(`   Artifacts created: ${Object.keys(state.artifacts).length}`);
}
