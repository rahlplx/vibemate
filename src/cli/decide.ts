import { Command } from 'commander';
import { createDecisionEngine } from '../decision/index.js';
import * as path from 'path';
import * as fs from 'fs';

export function decideCommand(): Command {
  const cmd = new Command('decide');

  cmd
    .description('Compare options and get a recommendation')
    .argument('<category>', 'Category to compare (database, runtime, framework, hosting)')
    .option('-o, --options <options>', 'Comma-separated option IDs to compare')
    .option('-d, --db <path>', 'Database path', '.vibe/vibemate.db')
    .action((category: string, options) => {
      const dbPath = path.resolve(options.db);
      const dbDir = path.dirname(dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const engine = createDecisionEngine(dbPath);

      console.log(`\nComparing ${category} options...\n`);

      const allOptions = engine.getOptions(category);
      const optionIds = options.options
        ? options.options.split(',')
        : allOptions.map((o) => o.id);

      const recommendation = engine.getRecommendation(category, optionIds);

      console.log(`Winner: ${recommendation.winner.id}`);
      console.log(`Score: ${(recommendation.winner.totalScore * 100).toFixed(1)}%`);

      if (recommendation.alternatives.length > 0) {
        console.log('\nAlternatives:');
        for (const alt of recommendation.alternatives) {
          console.log(`  - ${alt.id}: ${(alt.totalScore * 100).toFixed(1)}%`);
        }
      }

      engine.close();
    });

  return cmd;
}
