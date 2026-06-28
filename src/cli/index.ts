#!/usr/bin/env node

import { Command } from 'commander';
import { install, detectPlatform } from '../mcp/installer.js';
import { createSpecGenerator } from '../mcp/tools/spec-generator.js';
import { createAuthManager, createOAuthClient, type OAuthConfig } from '../mcp/auth.js';
import { createAutoFix } from '../mcp/tools/auto-fix.js';

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
      const { runEvolveCron } = await import('./evolve-helpers.js');
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

        const repos = config.mineRepos ?? [];
        if (repos.length > 0) {
          console.log(`\n📦 Mining ${repos.length} configured repo(s)...`);
          const vibeDir = join(root, config.stateDir);
          for (const url of repos) {
            try {
              console.log(`  Mining: ${url}`);
              const result = await mineRepo(url, { depth: config.mineDepth ?? 100, vibeDir });
              console.log(`  ✓ ${result.analysis.fileCount} files, ${result.jsonlRecordsWritten} JSONL records`);
            } catch (e) {
              console.warn(`  ⚠ Failed to mine ${url}: ${e instanceof Error ? e.message : e}`);
            }
          }
        }

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

program.parse();
