#!/usr/bin/env node

import { Command } from 'commander';
import { install, detectPlatform } from '../mcp/installer.js';
import { createSpecGenerator } from '../mcp/tools/spec-generator.js';
import { createAuthManager, createOAuthClient, type OAuthConfig } from '../mcp/auth.js';
import { createAutoFix } from '../mcp/tools/auto-fix.js';
import { generateTests } from '../sdd/test-generator.js';
import { EmbeddingStore } from '../context/embeddings.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve, join } from 'path';

const VIBEMATE_OAUTH: OAuthConfig = {
  clientId: 'vibemate-cli',
  redirectUri: 'http://localhost:3456/callback',
  authorizeUrl: 'https://vibemate.dev/auth/authorize',
  tokenUrl: 'https://vibemate.dev/auth/token',
  scopes: ['openid', 'profile', 'offline_access'],
};

const program = new Command();

program
  .name('vibemate')
  .description('Vibemate - AI-native product platform')
  .version('1.0.0');

program
  .command('install')
  .description('Install Vibemate MCP server into your AI coding tool')
  .option('-p, --platform <platform>', 'Target platform (claude, cursor, codex, kilocode, opencode)')
  .option('--dry-run', 'Show what would be installed without making changes')
  .action(async (options) => {
    try {
      const platform = options.platform || detectPlatform();
      
      if (!platform && !options.dryRun) {
        console.error('No supported AI coding tool detected. Please specify a platform with --platform.');
        process.exit(1);
      }
      
      console.log(`Installing Vibemate MCP server...`);
      
      const result = await install({
        platform: platform || 'claude',
        dryRun: options.dryRun
      });
      
      if (options.dryRun) {
        console.log('\nDry run - would install:');
        console.log(JSON.stringify(result.config, null, 2));
      } else {
        console.log(`\n✓ Installed to ${result.platform}`);
        if (result.backupPath) {
          console.log(`✓ Backup created: ${result.backupPath}`);
        }
        console.log('\nRestart your AI coding tool to use Vibemate.');
      }
    } catch (error) {
      console.error('Installation failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('spec')
  .description('Generate a product specification from a plain English idea')
  .argument('<idea>', 'Product idea description')
  .option('--stack <framework>', 'Target framework (nextjs, express, fastapi, laravel)')
  .option('--gen-tests', 'Generate test stubs from the spec after generation')
  .option('--test-output <dir>', 'Output directory for generated tests (default: tests/spec)')
  .option('--test-framework <framework>', 'Test framework: bun | vitest | jest (default: bun)')
  .action(async (idea, options) => {
    try {
      const apiKey = process.env.ANTHROPIC_API_KEY;

      if (!apiKey) {
        console.error('Error: Set the ANTHROPIC_API_KEY environment variable before running.');
        process.exit(1);
      }

      console.log(`Generating specification for: "${idea}"\n`);

      const generator = createSpecGenerator({ apiKey });
      const spec = await generator({
        idea,
        stack: options.stack ? { framework: options.stack } : undefined
      });

      console.log(`# ${spec.product.name}`);
      console.log(`\n${spec.product.oneLiner}\n`);
      console.log(`## Problem`);
      console.log(`${spec.product.problem}\n`);
      console.log(`## Solution`);
      console.log(`${spec.product.solution}\n`);
      console.log(`## Personas`);
      for (const persona of spec.personas) {
        console.log(`- ${persona.name}: ${persona.description}`);
      }
      console.log(`\n## Data Model`);
      for (const entity of spec.dataModel.entities) {
        console.log(`- ${entity.name}: ${entity.fields.length} fields`);
      }
      console.log(`\n## API Endpoints`);
      for (const endpoint of spec.apiContract.endpoints) {
        console.log(`- ${endpoint.method} ${endpoint.path}`);
      }

      if (options.genTests) {
        const framework = options.testFramework ?? 'bun';
        if (framework !== 'bun' && framework !== 'vitest' && framework !== 'jest') {
          console.error(`Error: Unsupported test framework "${framework}". Supported frameworks are: bun, vitest, jest.`);
          process.exit(1);
        }
        try {
          const result = generateTests(spec, {
            framework,
            outputDir: options.testOutput ?? 'tests/spec',
          });
          console.log(`\n## Generated Tests (${result.totalCases} cases across ${result.files.length} files)`);
          for (const file of result.files) {
            const fullPath = resolve(file.path);
            mkdirSync(dirname(fullPath), { recursive: true });
            writeFileSync(fullPath, file.content, 'utf-8');
            console.log(`  ✓ ${file.path} (${file.cases.length} cases)`);
          }
          console.log(`\nCoverage areas: ${result.coverageAreas.join(', ')}`);
        } catch (testError) {
          console.error('Test generation failed:', testError instanceof Error ? testError.message : testError);
          process.exit(1);
        }
      }
    } catch (error) {
      console.error('Spec generation failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show Vibemate status')
  .action(() => {
    const platform = detectPlatform();
    console.log('Vibemate Status');
    console.log('───────────────');
    console.log(`Version: 1.0.0`);
    console.log(`Detected platform: ${platform || 'none'}`);
    console.log(`API Key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'not set'}`);
  });

const auth = program.command('auth').description('Manage Vibemate authentication');

auth
  .command('login')
  .description('Log in to Vibemate via OAuth')
  .option('-t, --token <token>', 'Provide token directly (non-interactive)')
  .action(async (options) => {
    try {
      if (options.token) {
        const mgr = createAuthManager();
        mgr.storeToken('default', { token: options.token, tier: 'free' });
        console.log('Token stored successfully.');
        return;
      }

      const oauth = createOAuthClient(VIBEMATE_OAUTH);
      const url = await oauth.generateAuthUrl();
      console.log('Opening browser for Vibemate authentication...');
      console.log(`If browser does not open, visit:\n${url}\n`);

      try {
        const cmd = process.platform === 'win32'
          ? `start "" "${url}"`
          : process.platform === 'darwin'
            ? `open "${url}"`
            : `xdg-open "${url}"`;
        const { execSync } = await import('child_process');
        execSync(cmd, { shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/sh' });
      } catch (error) {
        console.error(`[CLI] Failed to open browser: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.log('Could not open browser. Visit the URL above manually.');
      }

      const server = await oauth.startLocalServer(3456);
      console.log('Waiting for authentication...');
      const AUTH_WAIT_MS = Number(process.env.VIBEMATE_AUTH_WAIT_MS) || 1000;
      await new Promise((resolve) => setTimeout(resolve, AUTH_WAIT_MS));
      server.close();
      console.log('\nAuthentication complete. Run `vibemate auth status` to verify.');
    } catch (error) {
      console.error('Login failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

auth
  .command('logout')
  .description('Log out from Vibemate')
  .action(() => {
    const mgr = createAuthManager();
    mgr.revokeToken('default');
    console.log('Logged out. Token removed.');
  });

auth
  .command('status')
  .description('Show authentication status')
  .action(() => {
    const mgr = createAuthManager();
    const token = mgr.getToken('default');
    if (!token) {
      console.log('Authentication status: not authenticated');
      console.log('Run `vibemate auth login` to authenticate.');
    } else {
      console.log(`Authentication status: authenticated`);
      console.log(`Tier: ${mgr.getTier('default')}`);
      if (token.userId) console.log(`User ID: ${token.userId}`);
      if (token.expiresAt) {
        const remaining = token.expiresAt - Date.now();
        const hours = Math.round(remaining / 3600000);
        console.log(`Token expires: ${hours > 0 ? `in ${hours}h` : 'expired'}`);
      }
    }
  });

const fix = program.command('fix').description('Scan and fix common project issues');

fix
  .command('scan')
  .description('Scan project for common issues')
  .action(async () => {
    try {
      const af = createAutoFix();
      const issues = await af.scan();
      if (issues.length === 0) {
        console.log('No issues found. Your project looks clean!');
        return;
      }
      console.log(`Found ${issues.length} issues:\n`);
      for (const issue of issues) {
        console.log(`[${issue.severity.toUpperCase()}] ${issue.description}`);
        console.log(`   Fix: ${issue.fix}\n`);
      }
    } catch (error) {
      console.error('Scan failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

fix
  .command('apply')
  .description('Apply fixes for detected issues')
  .option('-d, --dry-run', 'Preview fixes without applying')
  .action(async (options) => {
    try {
      const af = createAutoFix();
      const issues = await af.scan();
      if (issues.length === 0) {
        console.log('No issues to fix.');
        return;
      }
      if (options.dryRun) {
        console.log('Dry run - would fix:');
        for (const issue of issues) {
          console.log(`  [${issue.severity.toUpperCase()}] ${issue.description}`);
        }
        return;
      }
      const results = await af.fix(issues);
      console.log('Fix results:');
      for (const r of results) {
        const icon = r.status === 'success' ? '✓' : r.status === 'failed' ? '✗' : '−';
        console.log(`  ${icon} ${r.id}${r.error ? `: ${r.error}` : ''}`);
      }
    } catch (error) {
      console.error('Fix failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

fix
  .command('status')
  .description('Show fix configuration and category info')
  .action(() => {
    const af = createAutoFix();
    console.log('Auto-Fix Categories:');
    for (const cat of af.getCategories()) {
      console.log(`  - ${cat}`);
    }
  });

const learn = program.command('learn').description('Learnings pipeline — clone, audit, extract patterns from external repos');

learn
  .command('run')
  .description('Run full learnings pipeline on a repository')
  .argument('<url>', 'Git repository URL')
  .option('-b, --branch <branch>', 'Branch to analyze')
  .option('-o, --output <dir>', 'Output directory for reports', './learnings')
  .option('--timeout <ms>', 'Timeout in ms', '300000')
  .action(async (url, options) => {
    try {
      const { createPipeline } = await import('../learnings/index.js');
      const { mkdirSync } = await import('fs');
      const { join } = await import('path');

      const outputDir = join(process.cwd(), options.output);
      if (!mkdirSync) {
        const fs = await import('fs');
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const pipeline = createPipeline({
        onStep: (step) => {
          const icons: Record<string, string> = {
            clone: '📦', instrument: '🔍', extract: '📊', audit: '🔎',
            value: '💎', patterns: '🧩', meta: '🧠', rl: '🎯', generate: '📋', complete: '✅',
          };
          console.log(`${icons[step] || '▸'} ${step}...`);
        },
      });

      console.log(`\n🚀 Starting learnings pipeline for: ${url}\n`);

      const state = await pipeline.run(
        {
          url,
          depth: 1,
          branch: options.branch,
          timeout: parseInt(options.timeout),
        },
        outputDir,
      );

      const reportPath = pipeline.saveReport(state, outputDir);

      console.log(`\n📊 Results:`);
      console.log(`   Findings: ${state.audit.length}`);
      console.log(`   Meta learnings: ${state.meta.length}`);
      console.log(`   RL signals: ${state.rl.length}`);
      if (state.plan) {
        console.log(`   Spec plan: ${state.plan.slices.length} slices, ${state.plan.estimatedEffort}h`);
      }
      if (state.errors.length > 0) {
        console.log(`   Errors: ${state.errors.length}`);
      }
      console.log(`\n📄 Report: ${reportPath}`);
    } catch (error) {
      console.error('Learnings pipeline failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

learn
  .command('audit')
  .description('Quick audit of a local project')
  .option('-d, --dir <path>', 'Project directory', '.')
  .action(async (options) => {
    try {
      const { extractData, audit, assessValue, findPatterns, generateMetaLearnings } = await import('../learnings/index.js');
      const { resolve } = await import('path');

      const dir = resolve(options.dir);
      console.log(`\n🔍 Auditing: ${dir}\n`);

      const data = extractData(dir);
      const findings = audit(data);
      const value = assessValue(data, findings);
      const patterns = findPatterns(data);
      const meta = generateMetaLearnings(data, findings, value);

      console.log(`📊 Score: ${value.overallScore}/100`);
      console.log(`🔎 Findings: ${findings.length}`);
      console.log(`🧩 Patterns: ${patterns.length}`);
      console.log(`🧠 Meta learnings: ${meta.length}`);

      if (findings.length > 0) {
        console.log(`\nTop findings:`);
        for (const f of findings.slice(0, 5)) {
          console.log(`  [${f.severity.toUpperCase()}] ${f.title}`);
        }
      }

      console.log(`\nDimensions:`);
      for (const [dim, score] of Object.entries(value.dimensions)) {
        console.log(`  ${dim}: ${score}/10`);
      }
    } catch (error) {
      console.error('Audit failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('evolve')
  .description('Run the EvolveAgent self-improvement cycle')
  .option('--cron', 'Trigger weekly reflection if interval has elapsed (safe to call daily via CI cron)')
  .action(async (options) => {
    try {
      const { SelfImprovementOrchestrator } = await import('../evolve/index.js');
      const { OKFGenerator } = await import('../okf/generator.js');
      const { runEvolveCron, runMineOnCron } = await import('./evolve-helpers.js');
      const { mineRepo } = await import('../learnings/repo-miner.js');
      const { loadConfig } = await import('../shared/config.js');
      const { join } = await import('path');

      const root = process.cwd();
      const vibeDir = join(root, '.vibe');
      const okf = new OKFGenerator(root);
      const orchestrator = new SelfImprovementOrchestrator(okf, { vibeDir });
      await orchestrator.init();
      const config = loadConfig(root);

      if (options.cron) {
        console.log('🔄 Vibemate EvolveAgent — cron run');
        await runEvolveCron(orchestrator);

        await runMineOnCron(
          config.mineRepos ?? [],
          { depth: config.mineDepth ?? 100, vibeDir: join(root, config.stateDir) },
          mineRepo,
        );

        console.log('✅ EvolveAgent cron complete.');
      } else {
        console.log('Run with --cron to trigger the weekly reflection cycle.');
      }
    } catch (error) {
      console.error('Evolve failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('mine')
  .description('Mine a GitHub/Git repo for architecture patterns and deep-learning data')
  .argument('<url>', 'Git repository URL to mine')
  .option('--depth <n>', 'Number of commits to analyze', '100')
  .option('--dry-run', 'Print what would be mined without writing files')
  .option('--vibe-dir <dir>', 'Output directory (default: .vibe)', '.vibe')
  .action(async (url, options) => {
    try {
      const { mineRepo } = await import('../learnings/repo-miner.js');
      const { join } = await import('path');

      const vibeDir = join(process.cwd(), options.vibeDir);
      const depth = parseInt(options.depth, 10);
      const dryRun = !!options.dryRun;

      console.log(`\n🔍 Mining: ${url}`);
      if (dryRun) console.log('   (dry run — no files will be written)');

      const result = await mineRepo(url, { depth, vibeDir, dryRun });

      console.log(`\n📊 Results:`);
      console.log(`   Languages: ${Object.keys(result.analysis.languages).join(', ') || 'none detected'}`);
      console.log(`   Files: ${result.analysis.fileCount}`);
      console.log(`   Commits analyzed: ${result.analysis.commitCount}`);
      console.log(`   Patterns: ${result.analysis.detectedPatterns.join(', ') || 'none'}`);
      if (result.okfPath) console.log(`   OKF: ${result.okfPath}`);
      if (result.jsonlRecordsWritten) console.log(`   JSONL records: ${result.jsonlRecordsWritten}`);
    } catch (error) {
      console.error('Mine failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('context:embed')
  .description('Pre-warm the RAG embedding cache from OKF knowledge files in .vibe/')
  .option('--dir <path>', 'Project root containing .vibe/ directory', process.cwd())
  .option('--dry-run', 'Show what would be embedded without writing')
  .action(async (options) => {
    const vibeDir = join(options.dir, '.vibe');
    const store = new EmbeddingStore(vibeDir);
    try {
      console.log(`Embedding OKF chunks from ${vibeDir}...`);
      const chunks = await store.embedOKFChunks(vibeDir);
      if (chunks.length === 0) {
        console.log('No markdown files found in .vibe/ — nothing to embed.');
        return;
      }
      if (options.dryRun) {
        console.log(`[dry-run] Would embed ${chunks.length} chunk(s) — skipping write.`);
        for (const c of chunks) console.log(`  ${c.source} (${c.content.length} chars)`);
        return;
      }
      await store.save();
      console.log(`Embedded ${chunks.length} chunk(s) → ${vibeDir}/embeddings/chunks.json`);
    } catch (error) {
      console.error('Embedding failed:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// ─── vibemate prompts ─────────────────────────────────────────────────────────
import { PromptRegistry } from '../prompts/registry.js';
import { PromptEvolver } from '../prompts/evolver.js';
import { PromptMiner } from '../prompts/miner.js';
import { loadConfig } from '../shared/config.js';
import { createNodeAdapter } from '../context/embeddings.js';
import { RequirementsTracker, type MoSCoWTier } from '../shared/requirements-tracker.js';

const prompts = program.command('prompts').description('Manage system prompts and auto-evolution');

prompts
  .command('list')
  .description('List all prompt templates in the registry')
  .option('--category <cat>', 'Filter by category (role, domain, framework, security, testing, evolved, org)')
  .option('--json', 'Output as JSON')
  .action((options) => {
    const registry = new PromptRegistry();
    const list = registry.list(options.category);
    if (options.json) {
      console.log(JSON.stringify(list, null, 2));
      return;
    }
    console.log(`\nPrompt Templates (${list.length})\n`);
    for (const t of list) {
      const usage = t.usageCount > 0 ? ` | ${Math.round(t.successRate * 100)}% success over ${t.usageCount} uses` : '';
      console.log(`  ${t.id.padEnd(32)} [${t.category}] conf=${t.confidence.toFixed(2)}${usage}`);
      console.log(`  "${t.content.slice(0, 80)}${t.content.length > 80 ? '…' : ''}"`);
      console.log();
    }
  });

prompts
  .command('compose')
  .description('Preview the composed system prompt for a phase')
  .option('--phase <phase>', 'Phase to preview (think, plan, build, …)')
  .option('--dir <path>', 'Project root', process.cwd())
  .action((options) => {
    const config = loadConfig(options.dir);
    const registry = new PromptRegistry();
    const composed = registry.compose({
      activeRoleIds: config.promptRoles ?? [],
      systemPrompt: config.systemPrompt,
      phasePrompts: config.phasePrompts,
      phase: options.phase,
    });
    console.log('\n── Composed System Prompt ──────────────────────────────────────');
    console.log(composed.systemPrompt);
    console.log('\n── Active template IDs ─────────────────────────────────────────');
    console.log(composed.activeTemplateIds.length ? composed.activeTemplateIds.join(', ') : '(none)');
    if (composed.phaseOverride) {
      console.log('\n── Phase override ──────────────────────────────────────────────');
      console.log(composed.phaseOverride);
    }
  });

prompts
  .command('evolve')
  .description('Run one evolution pass over low-performing prompts (requires telemetry data)')
  .option('--dir <path>', 'Project root', process.cwd())
  .option('--apply', 'Auto-apply evolved prompts (otherwise stored as low-confidence candidates)')
  .option('--dry-run', 'Show which prompts would be evolved without changing them')
  .action(async (options) => {
    const vibeDir = join(options.dir, '.vibe');
    const adapter = createNodeAdapter();
    const evolver = new PromptEvolver({ adapter });
    const storeKey = join(vibeDir, 'prompts', 'registry.json');

    // Load persisted registry or start with built-ins
    const registry = (await evolver.load(storeKey)) ?? new PromptRegistry();
    const outcomes = registry.getOutcomes();
    const candidates = registry.list().filter(t => evolver.shouldEvolve(t, outcomes));

    if (options.dryRun) {
      if (candidates.length === 0) {
        console.log('No prompts qualify for evolution (need ≥10 samples and <70% success rate).');
      } else {
        console.log(`\nWould evolve ${candidates.length} prompt(s):`);
        for (const t of candidates) {
          const rel = outcomes.filter(o => o.templateId === t.id);
          const sr = rel.filter(o => o.outcome === 'success').length / rel.length;
          console.log(`  ${t.id} — ${rel.length} samples, ${Math.round(sr * 100)}% success`);
        }
      }
      return;
    }

    const count = await evolver.run(registry, { autoApply: options.apply });
    if (count === 0) {
      console.log('No prompts evolved — all are performing well or have insufficient data.');
    } else {
      console.log(`Evolved ${count} prompt(s).${options.apply ? ' Applied.' : ' Stored as candidates (use --apply to activate).'}`);
      await evolver.persist(registry, storeKey);
    }
  });

prompts
  .command('mine')
  .description('Learn from external prompt repositories and score against project tech stack')
  .option('--tech <stack>', 'Comma-separated tech stack (e.g. typescript,bun,react)', 'typescript')
  .option('--min-relevance <n>', 'Minimum BM25 relevance score to include (default: 0)', '0')
  .option('--max <n>', 'Maximum results to return (default: 10)', '10')
  .option('--apply', 'Add mined prompts to the local registry')
  .option('--dir <path>', 'Project root', process.cwd())
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const miner = new PromptMiner();
    const techStack = (options.tech as string).split(',').map(t => t.trim()).filter(Boolean);
    const results = await miner.mine({
      techStack,
      minRelevance: parseFloat(options.minRelevance),
      maxResults: parseInt(options.max, 10),
    });

    if (options.json) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log(`\nMined ${results.length} prompt(s) for stack: ${techStack.join(', ')}\n`);
      for (const r of results) {
        console.log(`  [score=${r.relevanceScore.toFixed(3)}] ${r.template.name}`);
        console.log(`  "${r.template.content.slice(0, 100)}${r.template.content.length > 100 ? '…' : ''}"`);
        if (r.sourceUrl) console.log(`  source: ${r.sourceUrl}`);
        console.log();
      }
    }

    if (options.apply && results.length > 0) {
      const vibeDir = join(options.dir, '.vibe');
      const adapter = createNodeAdapter();
      const evolver = new PromptEvolver({ adapter });
      const storeKey = join(vibeDir, 'prompts', 'registry.json');
      const registry = (await evolver.load(storeKey)) ?? new PromptRegistry();
      for (const r of results) registry.add(r.template);
      await evolver.persist(registry, storeKey);
      console.log(`Applied ${results.length} mined prompt(s) to registry.`);
    }
  });

// ─── requirements commands ────────────────────────────────────────────────────

const requirements = program.command('requirements').description('Manage MoSCoW requirements — track must/should/could/wont with evidence and persona');

requirements
  .command('list')
  .description('List all requirements, optionally filtered by tier')
  .option('--tier <tier>', 'Filter by tier: must | should | could | wont')
  .option('--status <status>', 'Filter by status: active | delivered | deferred | dropped')
  .option('--dir <path>', 'Project root', process.cwd())
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const reqFile = join(options.dir, '.vibe', 'requirements.json');
    let tracker: RequirementsTracker;
    try {
      const raw = await import('fs/promises').then(fs => fs.readFile(reqFile, 'utf-8'));
      tracker = RequirementsTracker.fromJSON(JSON.parse(raw));
    } catch {
      tracker = new RequirementsTracker();
    }

    const reqs = tracker.list(options.tier as MoSCoWTier | undefined, options.status as any);
    if (options.json) { console.log(JSON.stringify(reqs, null, 2)); return; }

    const stats = tracker.getStats();
    console.log(`\nRequirements — ${stats.total} total | ${stats.delivered} delivered | ${(stats.deliveryRate * 100).toFixed(0)}% delivery rate\n`);

    const tierLabels: Record<string, string> = { must: 'MUST', should: 'SHOULD', could: 'COULD', wont: "WON'T" };
    const tiers: MoSCoWTier[] = options.tier ? [options.tier as MoSCoWTier] : ['must', 'should', 'could', 'wont'];
    for (const tier of tiers) {
      const items = reqs.filter(r => r.tier === tier);
      if (items.length === 0) continue;
      console.log(`── ${tierLabels[tier]} HAVE (${items.length}) ─────────────────────────`);
      for (const r of items) {
        const badge = r.status !== 'active' ? ` [${r.status}]` : '';
        console.log(`  • ${r.title}${badge}`);
        console.log(`    ${r.rationale.slice(0, 80)}${r.rationale.length > 80 ? '…' : ''}`);
        console.log(`    persona=${r.persona} | source=${r.source} | context=${r.context}`);
      }
      console.log();
    }
  });

requirements
  .command('add')
  .description('Add a new requirement (evidence-backed)')
  .requiredOption('--tier <tier>', 'MoSCoW tier: must | should | could | wont')
  .requiredOption('--title <title>', 'Short requirement title')
  .requiredOption('--rationale <rationale>', 'WHY this tier — evidence-backed reasoning')
  .option('--persona <persona>', 'Stakeholder perspective', 'developer')
  .option('--context <context>', 'Pipeline phase or situation', 'user-stated')
  .option('--source <source>', 'Source: user | llm-inferred | code-analysis | test-failure | evidence', 'user')
  .option('--tags <tags>', 'Comma-separated tags', '')
  .option('--dir <path>', 'Project root', process.cwd())
  .action(async (options) => {
    const vibeDir = join(options.dir, '.vibe');
    const reqFile = join(vibeDir, 'requirements.json');
    let tracker: RequirementsTracker;
    try {
      const raw = await import('fs/promises').then(fs => fs.readFile(reqFile, 'utf-8'));
      tracker = RequirementsTracker.fromJSON(JSON.parse(raw));
    } catch {
      tracker = new RequirementsTracker();
    }

    const req = tracker.add({
      tier: options.tier as MoSCoWTier,
      title: options.title,
      rationale: options.rationale,
      persona: options.persona,
      context: options.context,
      source: options.source as any,
      tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      status: 'active',
    });

    const { mkdir, writeFile } = await import('fs/promises');
    await mkdir(vibeDir, { recursive: true });
    await writeFile(reqFile, JSON.stringify(tracker.toJSON(), null, 2));
    await writeFile(join(vibeDir, 'requirements.md'), tracker.toMarkdown());

    console.log(`Added [${req.tier.toUpperCase()}] ${req.title} (${req.id})`);
  });

requirements
  .command('stats')
  .description('Show MoSCoW delivery statistics')
  .option('--dir <path>', 'Project root', process.cwd())
  .action(async (options) => {
    const reqFile = join(options.dir, '.vibe', 'requirements.json');
    let tracker: RequirementsTracker;
    try {
      const raw = await import('fs/promises').then(fs => fs.readFile(reqFile, 'utf-8'));
      tracker = RequirementsTracker.fromJSON(JSON.parse(raw));
    } catch {
      tracker = new RequirementsTracker();
    }
    const s = tracker.getStats();
    console.log(`\nMoSCoW Delivery Stats`);
    console.log(`  Total:     ${s.total}`);
    console.log(`  Must:      ${s.byTier.must}`);
    console.log(`  Should:    ${s.byTier.should}`);
    console.log(`  Could:     ${s.byTier.could}`);
    console.log(`  Won't:     ${s.byTier.wont}`);
    console.log(`  Active:    ${s.active}`);
    console.log(`  Delivered: ${s.delivered}`);
    console.log(`  Rate:      ${(s.deliveryRate * 100).toFixed(1)}%`);
  });

requirements
  .command('export')
  .description('Export requirements as markdown OKF document')
  .option('--dir <path>', 'Project root', process.cwd())
  .option('--out <file>', 'Output file (default: stdout)')
  .action(async (options) => {
    const reqFile = join(options.dir, '.vibe', 'requirements.json');
    let tracker: RequirementsTracker;
    try {
      const raw = await import('fs/promises').then(fs => fs.readFile(reqFile, 'utf-8'));
      tracker = RequirementsTracker.fromJSON(JSON.parse(raw));
    } catch {
      tracker = new RequirementsTracker();
    }
    const md = tracker.toMarkdown();
    if (options.out) {
      await import('fs/promises').then(fs => fs.writeFile(options.out, md));
      console.log(`Written to ${options.out}`);
    } else {
      console.log(md);
    }
  });

program.parse();
