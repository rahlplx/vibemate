// Vibemate Sync Command - Compile artifacts for detected AI agent
import { Command } from 'commander';
import { HarnessCompiler } from '../compiler/index.js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { AgentType } from '../types.js';

interface SyncOptions {
  agent?: AgentType;
  verbose?: boolean;
}

export function syncCommand(program: Command): void {
  program
    .command('sync')
    .description('Compile .agents/ to native artifacts for your AI agent')
    .option('-a, --agent <agent>', 'Force specific agent (claude-code, opencode, cursor, codex)')
    .option('-v, --verbose', 'Verbose output')
    .action(async (options: SyncOptions) => {
      await syncArtifacts(options);
    });
}

async function syncArtifacts(options: SyncOptions): Promise<void> {
  console.log('🔄 Syncing Vibemate artifacts...\n');

  const root = process.cwd();

  // Step 1: Detect AI Agent
  console.log('🔍 Detecting AI agent...');
  const agentType = options.agent || await detectAgent(root);
  console.log(`   ✓ Detected: ${agentType}\n`);

  // Step 2: Load OKF Bundle
  console.log('📚 Loading OKF bundle...');
  const bundle = await loadBundle(root);
  console.log(`   ✓ Loaded ${bundle.concepts.length} concepts\n`);

  // Step 3: Compile artifacts
  console.log('⚙️  Compiling artifacts...');
  const compiler = new HarnessCompiler(root, agentType);
  
  // Get skills from OKF bundle
  const skills = bundle.concepts
    .filter(c => c.frontmatter.type === 'skill')
    .map(c => c.frontmatter.title || 'unknown');
  
  // Add default skills if none found
  if (skills.length === 0) {
    skills.push('tdd-workflow', 'security-audit', 'performance-optimization');
  }

  const artifacts = await compiler.compile(bundle, skills);
  console.log(`   ✓ Generated ${artifacts.skills.length} skill files`);
  console.log(`   ✓ Config: ${artifacts.config}`);
  console.log(`   ✓ Context: ${artifacts.context}\n`);

  // Step 4: Verify compilation
  console.log('✅ Verifying compilation...');
  const verification = await compiler.verify();
  if (verification.valid) {
    console.log('   ✓ All artifacts verified\n');
  } else {
    console.log(`   ⚠️  Missing: ${verification.missing.join(', ')}\n`);
  }

  // Step 5: Update state.json
  console.log('📊 Updating state...');
  const statePath = join(root, '.vibe', 'state.json');
  try {
    const stateContent = await readFile(statePath, 'utf-8');
    const state = JSON.parse(stateContent);
    state.agent = agentType;
    state.artifacts = {
      skills: artifacts.skills.join(', '),
      config: artifacts.config,
      context: artifacts.context
    };
    state.syncedAt = new Date().toISOString();
    const { writeFile } = await import('fs/promises');
    await writeFile(statePath, JSON.stringify(state, null, 2));
    console.log('   ✓ State updated\n');
  } catch {
    console.log('   ⚠️  Could not update state.json\n');
  }

  // Summary
  console.log('✅ Sync complete!\n');
  console.log(`Agent: ${agentType}`);
  console.log(`Skills: ${artifacts.skills.length}`);
  console.log(`Config: ${artifacts.config}`);
  console.log(`Context: ${artifacts.context}`);
  console.log('\nYour AI agent is now configured with Vibemate context!');
}

async function detectAgent(root: string): Promise<AgentType> {
  // Check environment variables
  if (process.env.CLAUDE_CODE) return 'claude-code';
  if (process.env.OPENCODE) return 'opencode';
  if (process.env.CODEX) return 'codex';

  // Check for config files
  try {
    await readFile(join(root, '.cursorrules'));
    return 'cursor';
  } catch {}

  try {
    await readFile(join(root, 'CLAUDE.md'));
    return 'claude-code';
  } catch {}

  try {
    await readFile(join(root, 'opencode.json'));
    return 'opencode';
  } catch {}

  try {
    await readFile(join(root, 'AGENTS.md'));
    return 'codex';
  } catch {}

  // Default to claude-code
  return 'claude-code';
}

async function loadBundle(root: string) {
  const bundleRoot = join(root, '.agents', 'okf-bundle');
  const concepts: Array<{ path: string; frontmatter: Record<string, string>; body: string }> = [];

  try {
    const files = await readdir(bundleRoot, { recursive: true });
    for (const file of files) {
      if (file.endsWith('.md') && file !== 'index.md' && file !== 'log.md') {
        const content = await readFile(join(bundleRoot, file as string), 'utf-8');
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
          const frontmatter: Record<string, string> = {};
          const lines = frontmatterMatch[1].split('\n');
          for (const line of lines) {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length > 0) {
              frontmatter[key.trim()] = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
            }
          }
          concepts.push({
            path: file,
            frontmatter,
            body: content.substring(frontmatterMatch[0].length).trim()
          });
        }
      }
    }
  } catch {
    // Bundle doesn't exist yet
  }

  return {
    root: bundleRoot,
    version: '0.1',
    concepts
  };
}
