// Vibemate Init Command - Bootstrap project with all configurations
import { Command } from 'commander';
import { OKFGenerator } from '../okf/generator.js';
import { MCPConfigGenerator } from '../mcp/config.js';
import { TelemetryCollector } from '../telemetry/collector.js';
import { StackDetector } from '../mcp/stack-detector.js';
import { resolveLSPConfig } from './lsp.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import inquirer from 'inquirer';

export { resolveLSPConfig };

interface InitOptions {
  description?: string;
  providers?: string;
  budget?: number;
  skipPrompts?: boolean;
}

export function initCommand(program: Command): void {
  program
    .command('init')
    .description('Initialize Vibemate for your project')
    .argument('[description]', 'Project description for AI context')
    .option('-p, --providers <providers>', 'Cloud providers (comma-separated)', 'anthropic,google,openai')
    .option('-b, --budget <budget>', 'Monthly budget in USD', '50')
    .option('-y, --yes', 'Skip prompts and use defaults')
    .action(async (description: string | undefined, options: InitOptions) => {
      await initVibemate(description, options);
    });
}

async function initVibemate(description: string | undefined, options: InitOptions): Promise<void> {
  console.log('🚀 Initializing Vibemate...\n');

  // Get project info
  let projectName = 'my-project';
  let projectDescription = description;
  let providers = options.providers?.split(',') || ['anthropic', 'google', 'openai'];
  let budget = parseInt(String(options.budget || '50'), 10);

  if (!options.skipPrompts && !description) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: 'my-project'
      },
      {
        type: 'input',
        name: 'description',
        message: 'Project description:',
        validate: (input: string) => input.length > 0 || 'Description is required'
      },
      {
        type: 'checkbox',
        name: 'providers',
        message: 'Select cloud providers:',
        choices: [
          { name: 'Anthropic (Claude)', value: 'anthropic', checked: true },
          { name: 'Google (Gemini)', value: 'google', checked: true },
          { name: 'OpenAI (GPT)', value: 'openai', checked: true }
        ]
      },
      {
        type: 'number',
        name: 'budget',
        message: 'Monthly budget (USD):',
        default: 50,
        validate: (input: number) => input > 0 || 'Budget must be positive'
      }
    ]);

    projectName = answers.projectName;
    projectDescription = answers.description;
    providers = answers.providers;
    budget = answers.budget;
  }

  const root = process.cwd();
  console.log(`📁 Project: ${projectName}`);
  console.log(`📝 Description: ${projectDescription || 'Not provided'}`);
  console.log(`💰 Budget: $${budget}/month`);
  console.log(`☁️  Providers: ${providers.join(', ')}\n`);

  // Step 1: Create OKF Bundle
  console.log('📚 Creating OKF Bundle with architectural decisions...');
  const okfGenerator = new OKFGenerator(root);
  const bundle = await okfGenerator.generate(projectName);
  console.log(`   ✓ Created ${bundle.concepts.length} architectural decisions`);

  // Step 2: Create MCP Configuration
  console.log('\n🔌 Configuring MCP Servers...');
  const mcpGenerator = new MCPConfigGenerator({
    projectRoot: root,
    includeVibemateServers: true,
    enabledServers: ['context7', 'github', 'playwright', 'filesystem', 'vibemate-telemetry', 'vibemate-okf']
  });
  const mcpConfigPath = await mcpGenerator.writeConfig();
  console.log(`   ✓ Created ${mcpConfigPath}`);
  console.log(`   ✓ Pinned versions: ${Object.entries(mcpGenerator.getPinnedVersions()).map(([k, v]) => `${k}@${v}`).join(', ')}`);

  // Step 3: Create .vibe directory structure
  console.log('\n📊 Setting up telemetry...');
  await mkdir(join(root, '.vibe', 'telemetry'), { recursive: true });
  void new TelemetryCollector({
    enabled: true,
    exportDir: join(root, '.vibe', 'telemetry'),
    serviceName: projectName,
    serviceVersion: '1.0.0'
  });

  // Step 4: Create state.json
  const stateJson = {
    project: projectName,
    phase: 'init',
    step: '',
    completed: [],
    agent: 'unknown',
    hasUI: false,
    mode: 'guided',
    telemetry: true,
    artifacts: {},
    createdAt: new Date().toISOString()
  };
  await writeFile(join(root, '.vibe', 'state.json'), JSON.stringify(stateJson, null, 2));
  console.log('   ✓ Created .vibe/state.json');

  // Step 5: Create stack.json + resolve LSP configs
  const stackDetector = new StackDetector(root);
  let detectedStack: Awaited<ReturnType<StackDetector['detect']>> | null = null;
  try {
    detectedStack = await stackDetector.detect();
  } catch {
    // Stack detection is best-effort
  }

  const stackJson = {
    type: 'skill-repo',
    frameworks: detectedStack ? [detectedStack.framework] : [],
    language: detectedStack?.language ?? 'unknown',
    buildCommand: '',
    testCommand: '',
    detectedAt: new Date().toISOString()
  };
  await writeFile(join(root, '.vibe', 'stack.json'), JSON.stringify(stackJson, null, 2));
  console.log('   ✓ Created .vibe/stack.json');

  // Write LSP configs as MCP server entries
  if (detectedStack) {
    const lspConfigs = resolveLSPConfig(detectedStack);
    if (lspConfigs.length > 0) {
      const lspMcpEntries: Record<string, { command: string; args: string[] }> = {};
      for (const lsp of lspConfigs) {
        lspMcpEntries[`lsp-${lsp.name}`] = { command: lsp.command, args: lsp.args };
      }
      await writeFile(join(root, '.vibe', 'lsp-config.json'), JSON.stringify({ mcpServers: lspMcpEntries }, null, 2));
      console.log(`   ✓ LSP configs resolved: ${lspConfigs.map(l => l.name).join(', ')}`);
    }
  }

  // Step 6: Create evolution.json
  const evolutionJson = {
    rules: [],
    learnings: [],
    principles: [],
    lastReflection: null,
    createdAt: new Date().toISOString()
  };
  await writeFile(join(root, '.vibe', 'evolution.json'), JSON.stringify(evolutionJson, null, 2));
  console.log('   ✓ Created .vibe/evolution.json');

  // Step 7: Create handoff.md template
  const handoffMd = `# Handoff

## Current Phase
init

## Completed
- OKF bundle created
- MCP servers configured
- Telemetry initialized

## Next Steps
Run \`vibemate sync\` to compile artifacts for your AI agent.
`;
  await writeFile(join(root, '.vibe', 'handoff.md'), handoffMd);
  console.log('   ✓ Created .vibe/handoff.md');

  // Step 8: Create .gitignore entries
  const gitignore = `
# Vibemate
.vibe/telemetry/
.vibe/context-cache/
.mcp.json
node_modules/
dist/
`;
  const appendGitignore = async () => {
    try {
      const { readFile } = await import('fs/promises');
      const existing = await readFile(join(root, '.gitignore'), 'utf-8');
      if (!existing.includes('.vibe/telemetry/')) {
        await writeFile(join(root, '.gitignore'), existing + gitignore);
      }
    } catch (error) {
      console.error(`[Init] Failed to read .gitignore: ${error instanceof Error ? error.message : 'Unknown error'}`);
      await writeFile(join(root, '.gitignore'), gitignore);
    }
  };
  await appendGitignore();
  console.log('   ✓ Updated .gitignore');

  // Step 9: Create README section
  const readmeSection = `
## Vibemate Configuration

This project uses Vibemate for unified AI coding agent orchestration.

### Quick Start

\`\`\`bash
# Sync artifacts for your AI agent
npx vibemate sync

# Run auto mode
npx vibemate auto "Build me a feature"

# Check status
npx vibemate status
\`\`\`

### OKF Bundle

Architectural decisions are stored in \`.agents/okf-bundle/\`.

### MCP Servers

Configured servers: ${Object.entries(mcpGenerator.getPinnedVersions()).map(([k, v]) => `${k}@${v}`).join(', ')}

### Telemetry

All actions are logged to \`.vibe/telemetry/\` for retrospective analysis.
`;
  await writeFile(join(root, 'VIBEMATE_README.md'), readmeSection);
  console.log('   ✓ README section ready');

  // Summary
  console.log('\n✅ Vibemate initialized successfully!\n');
  console.log('Next steps:');
  console.log('  1. Run `npx vibemate sync` to compile artifacts for your AI agent');
  console.log('  2. Run `npx vibemate auto "Build me a feature"` to start building');
  console.log('  3. Run `npx vibemate status` to check project status\n');
  console.log('Documentation: https://github.com/rahlplx/vibemate');
}
