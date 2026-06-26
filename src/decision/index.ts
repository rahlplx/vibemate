import { createConnection, closeConnection } from '../state/connection.js';
import { runMigrations } from '../state/migrations.js';
import { createStore } from '../state/store.js';
import { createMatrix, addOption, addCriteria, type ComparisonMatrix } from './matrix.js';
import { rankOptions, type RankedOption } from './scorer.js';
import databases from './data/databases.json';
import runtimes from './data/runtimes.json';
import frameworks from './data/frameworks.json';
import hosting from './data/hosting.json';

interface BenchmarkOption {
  id: string;
  name: string;
  category: string;
  scores: Record<string, number>;
}

const BENCHMARK_DATA: Record<string, BenchmarkOption[]> = {
  database: databases,
  runtime: runtimes,
  framework: frameworks,
  hosting: hosting,
};

const CRITERIA_BY_CATEGORY: Record<string, { id: string; name: string; weight: number }[]> = {
  database: [
    { id: 'performance', name: 'Performance', weight: 0.25 },
    { id: 'cost', name: 'Cost', weight: 0.2 },
    { id: 'scalability', name: 'Scalability', weight: 0.2 },
    { id: 'ease_of_use', name: 'Ease of Use', weight: 0.15 },
    { id: 'maintenance', name: 'Maintenance', weight: 0.1 },
    { id: 'ecosystem', name: 'Ecosystem', weight: 0.1 },
  ],
  runtime: [
    { id: 'performance', name: 'Performance', weight: 0.3 },
    { id: 'cost', name: 'Cost', weight: 0.15 },
    { id: 'developer_experience', name: 'Developer Experience', weight: 0.25 },
    { id: 'ecosystem', name: 'Ecosystem', weight: 0.15 },
    { id: 'cold_start', name: 'Cold Start', weight: 0.1 },
    { id: 'memory_efficiency', name: 'Memory Efficiency', weight: 0.05 },
  ],
  framework: [
    { id: 'performance', name: 'Performance', weight: 0.25 },
    { id: 'developer_experience', name: 'Developer Experience', weight: 0.2 },
    { id: 'ecosystem', name: 'Ecosystem', weight: 0.15 },
    { id: 'seo', name: 'SEO', weight: 0.2 },
    { id: 'bundle_size', name: 'Bundle Size', weight: 0.1 },
    { id: 'learning_curve', name: 'Learning Curve', weight: 0.1 },
  ],
  hosting: [
    { id: 'performance', name: 'Performance', weight: 0.25 },
    { id: 'cost', name: 'Cost', weight: 0.25 },
    { id: 'ease_of_use', name: 'Ease of Use', weight: 0.2 },
    { id: 'scalability', name: 'Scalability', weight: 0.15 },
    { id: 'global_coverage', name: 'Global Coverage', weight: 0.1 },
    { id: 'cold_start', name: 'Cold Start', weight: 0.05 },
  ],
};

export interface Recommendation {
  winner: RankedOption;
  alternatives: RankedOption[];
  comparison: ComparisonMatrix;
}

export interface DecisionEngine {
  getOptions(category: string): BenchmarkOption[];
  createComparison(category: string, optionIds: string[]): ComparisonMatrix;
  rankOptions(category: string, optionIds: string[]): RankedOption[];
  getRecommendation(category: string, optionIds: string[]): Recommendation;
  close(): void;
}

export function createDecisionEngine(dbPath: string): DecisionEngine {
  const conn = createConnection(dbPath);
  runMigrations(conn);
  createStore(conn);

  return {
    getOptions(category) {
      return BENCHMARK_DATA[category] ?? [];
    },

    createComparison(category, optionIds) {
      const allOptions = BENCHMARK_DATA[category] ?? [];
      const selected = allOptions.filter((o) => optionIds.includes(o.id));
      const criteria = CRITERIA_BY_CATEGORY[category] ?? [];

      let matrix = createMatrix(`${category}-comparison`);

      for (const opt of selected) {
        matrix = addOption(matrix, { id: opt.id, name: opt.name, description: '' });
      }

      for (const c of criteria) {
        matrix = addCriteria(matrix, c);
      }

      return matrix;
    },

    rankOptions(category, optionIds) {
      const allOptions = BENCHMARK_DATA[category] ?? [];
      const selected = allOptions.filter((o) => optionIds.includes(o.id));
      const criteria = CRITERIA_BY_CATEGORY[category] ?? [];

      return rankOptions(
        selected.map((o) => ({ id: o.id, scores: o.scores })),
        criteria
      );
    },

    getRecommendation(category, optionIds) {
      const ranked = this.rankOptions(category, optionIds);
      const matrix = this.createComparison(category, optionIds);

      return {
        winner: ranked[0],
        alternatives: ranked.slice(1),
        comparison: matrix,
      };
    },

    close() {
      closeConnection(conn);
    },
  };
}
