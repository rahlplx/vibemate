import { Command } from 'commander';
import { createScaffoldGenerator } from '../scaffold/generator.js';
import * as path from 'path';

export function scaffoldCommand(): Command {
  const cmd = new Command('scaffold');

  cmd
    .description('Generate project scaffolding from a template')
    .argument('<name>', 'Project name')
    .option('-t, --template <template>', 'Template name (default, api, cli)', 'default')
    .option('-d, --dir <directory>', 'Target directory', '.')
    .option('--description <desc>', 'Project description', '')
    .action((name: string, options) => {
      const targetDir = path.resolve(options.dir, name);
      const generator = createScaffoldGenerator();

      console.log(`\nScaffolding "${name}" with template "${options.template}"...\n`);

      const files = generator.generate(targetDir, options.template, {
        projectName: name,
        description: options.description,
      });

      console.log('Created files:');
      for (const file of files) {
        console.log(`  ${file}`);
      }

      console.log(`\nDone! ${files.length} files created.`);
    });

  return cmd;
}
