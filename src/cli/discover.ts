import { Command } from 'commander';
import { createDiscoveryEngine } from '../discovery/index.js';
import * as path from 'path';
import * as fs from 'fs';

export function discoverCommand(): Command {
  const cmd = new Command('discover');

  cmd
    .description('Start a discovery session to gather project requirements')
    .option('-t, --type <type>', 'Project type (saas, cli, api, mobile, static)', 'saas')
    .option('-d, --db <path>', 'Database path', '.vibe/vibemate.db')
    .action(async (options) => {
      const dbPath = path.resolve(options.db);
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const engine = createDiscoveryEngine(dbPath);
      const projectId = `proj-${Date.now()}`;

      console.log(`\nStarting discovery for ${options.type} project...\n`);

      const result = engine.startSession(projectId, options.type);
      console.log(`Question: ${result.question.text}`);

      if (result.question.options) {
        console.log('\nOptions:');
        for (const opt of result.question.options) {
          console.log(`  - ${opt.value}: ${opt.label}`);
        }
      }

      console.log(`\nProgress: ${result.progress}%`);
      console.log(`Session ID: ${result.sessionId}`);

      engine.close();
    });

  return cmd;
}
