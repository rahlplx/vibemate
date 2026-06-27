// Vibemate Status Command - View project status
import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Simple color helper
const colors = {
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`
};

interface StatusOptions {
  detailed?: boolean;
}

export function statusCommand(program: Command): void {
  program
    .command('status')
    .description('View project status')
    .option('-d, --detailed', 'Show detailed status')
    .action(async (options: StatusOptions) => {
      await showStatus(options);
    });
}

async function showStatus(options: StatusOptions): Promise<void> {
  console.log('📊 Vibemate Status\n');

  const root = process.cwd();

  const statePath = join(root, '.vibe', 'state.json');
  let state: { project?: string; phase?: string; mode?: string; agent?: string; telemetry?: boolean; completed?: string[]; artifacts?: Record<string, string> } | null = null;
  
  try {
    const content = await readFile(statePath, 'utf-8');
    state = JSON.parse(content);
  } catch (error) {
    console.error(`[Status] Failed to read state.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.log('❌ Vibemate not initialized.');
    console.log(`\nRun ${colors.cyan('npx vibemate init')} to get started.`);
    return;
  }

  if (!state) return;

  console.log(`Project: ${state.project ?? 'N/A'}`);
  console.log(`Phase: ${colors.cyan(state.phase ?? 'N/A')}`);
  console.log(`Mode: ${state.mode ?? 'N/A'}`);
  console.log(`Agent: ${state.agent ?? 'N/A'}`);
  console.log(`Telemetry: ${state.telemetry ? '✅ Enabled' : '❌ Disabled'}`);

  // Show completed phases
  if (state.completed && state.completed.length > 0) {
    console.log(`\nCompleted phases:`);
    for (const phase of state.completed) {
      console.log(`  ✅ ${phase}`);
    }
  }

  // Show artifacts
  if (state.artifacts && Object.keys(state.artifacts).length > 0) {
    console.log(`\nArtifacts:`);
    for (const [key, value] of Object.entries(state.artifacts)) {
      console.log(`  ${key}: ${value}`);
    }
  }

  // Detailed status
  if (options.detailed) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Detailed Status');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Check OKF bundle
    const okfPath = join(root, '.agents', 'okf-bundle');
    try {
      await readFile(join(okfPath, 'index.md'));
      console.log('✅ OKF Bundle: Present');
    } catch (error) {
      console.error(`[Status] OKF bundle check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('❌ OKF Bundle: Missing');
    }

    // Check MCP config
    const mcpPath = join(root, '.mcp.json');
    try {
      const mcpContent = await readFile(mcpPath, 'utf-8');
      const mcpConfig = JSON.parse(mcpContent);
      const serverCount = Object.keys(mcpConfig.mcpServers || {}).length;
      console.log(`✅ MCP Config: ${serverCount} servers configured`);
    } catch (error) {
      console.error(`[Status] MCP config check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('❌ MCP Config: Missing');
    }

    // Check telemetry
    const telemetryPath = join(root, '.vibe', 'telemetry');
    try {
      const { readdir } = await import('fs/promises');
      const files = await readdir(telemetryPath);
      const telemetryFiles = files.filter(f => f.startsWith('telemetry-') && f.endsWith('.json'));
      console.log(`✅ Telemetry: ${telemetryFiles.length} files`);
    } catch (error) {
      console.error(`[Status] Telemetry check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('⚠️  Telemetry: No data yet');
    }

    // Check evolution
    const evolutionPath = join(root, '.vibe', 'evolution.json');
    try {
      const content = await readFile(evolutionPath, 'utf-8');
      const evolution = JSON.parse(content);
      console.log(`✅ Evolution: ${evolution.learnings?.length || 0} learnings, ${evolution.principles?.length || 0} principles`);
    } catch (error) {
      console.error(`[Status] Evolution check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('⚠️  Evolution: No data yet');
    }

    // Check handoff
    const handoffPath = join(root, '.vibe', 'handoff.md');
    try {
      await readFile(handoffPath);
      console.log('✅ Handoff: Present');
    } catch (error) {
      console.error(`[Status] Handoff check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log('⚠️  Handoff: Missing');
    }
  }

  // Quick commands
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Quick Commands');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log(`${colors.cyan('npx vibemate sync')}     - Compile artifacts for your AI agent`);
  console.log(`${colors.cyan('npx vibemate auto')}     - Run autonomous pipeline`);
  console.log(`${colors.cyan('npx vibemate telemetry')} - View telemetry data`);
  console.log(`${colors.cyan('npx vibemate evolve')}    - Manage self-improvement`);
  console.log(`${colors.cyan('npx vibemate status')}    - View this status`);
}
