import type { RepoMineResult } from './repo-miner.js';

export interface BestPractice {
  id: string;
  category: BestPracticeCategory;
  title: string;
  description: string;
  sourceRepo: string;
  evidence: string[];
  confidence: number;
  applicableTo: string[];
}

export type BestPracticeCategory =
  | 'testing'
  | 'error-handling'
  | 'security'
  | 'architecture'
  | 'performance'
  | 'typescript'
  | 'cli'
  | 'api-design'
  | 'tooling';

export interface BestPracticesReport {
  sourceRepo: string;
  minedAt: string;
  practices: BestPractice[];
  topInsights: string[];
  applicabilityScore: number;
}

export function extractBestPractices(result: RepoMineResult): BestPracticesReport {
  const practices: BestPractice[] = [];
  const { url, analysis, folder, commits } = result;

  // Testing practices
  if (analysis.hasTests) {
    const testRatio = folder.testCoverage;
    if (testRatio === 'present') {
      practices.push({
        id: `${slugify(url)}-testing-present`,
        category: 'testing',
        title: 'Comprehensive test suite present',
        description: `${url} maintains a test suite covering the public API.`,
        sourceRepo: url,
        evidence: ['tests/ directory present', `Detected patterns: ${folder.detectedPatterns.join(', ')}`],
        confidence: 0.9,
        applicableTo: ['testing', 'quality'],
      });
    }
  }

  // CI practices
  if (analysis.hasCI) {
    practices.push({
      id: `${slugify(url)}-ci`,
      category: 'tooling',
      title: 'Continuous integration configured',
      description: `${url} uses CI to validate every change before merge.`,
      sourceRepo: url,
      evidence: ['.github/workflows present'],
      confidence: 0.95,
      applicableTo: ['ci', 'quality', 'automation'],
    });
  }

  // Security: package manager lock file
  if (analysis.packageManager) {
    practices.push({
      id: `${slugify(url)}-lockfile`,
      category: 'security',
      title: `Dependency pinning via ${analysis.packageManager}`,
      description: 'Lock files prevent supply-chain attacks from transitive dependency updates.',
      sourceRepo: url,
      evidence: [`Package manager: ${analysis.packageManager}`],
      confidence: 0.85,
      applicableTo: ['security', 'reproducibility'],
    });
  }

  // Architecture patterns from folder analysis
  for (const pattern of folder.detectedPatterns) {
    practices.push({
      id: `${slugify(url)}-arch-${slugify(pattern)}`,
      category: 'architecture',
      title: `Architecture pattern: ${pattern}`,
      description: `${url} uses the ${pattern} pattern — consider where it applies in Vibemate.`,
      sourceRepo: url,
      evidence: [`Pattern detected in folder structure`],
      confidence: 0.75,
      applicableTo: ['architecture', 'refactoring'],
    });
  }

  // Active commit history → healthy maintenance signal
  if (commits.commitFrequency === 'active') {
    practices.push({
      id: `${slugify(url)}-active-maintenance`,
      category: 'tooling',
      title: 'Actively maintained project',
      description: `${url} has ${commits.totalCommits} commits with active recent contributions — patterns here are current best practice.`,
      sourceRepo: url,
      evidence: [`Commit frequency: active`, `Contributors: ${commits.topContributors.slice(0, 3).map(c => c.author).join(', ')}`],
      confidence: 0.8,
      applicableTo: ['dependency-selection', 'learning'],
    });
  }

  // Config files → tooling patterns
  const interestingConfigs = folder.configFiles.filter(f =>
    ['tsconfig.json', 'biome.json', '.eslintrc.json', 'vitest.config.ts', 'bunfig.toml'].includes(f)
  );
  if (interestingConfigs.length > 0) {
    practices.push({
      id: `${slugify(url)}-tooling-config`,
      category: 'tooling',
      title: 'Tooling configuration: ' + interestingConfigs.join(', '),
      description: `${url} uses ${interestingConfigs.join(', ')} — review for config patterns to adopt.`,
      sourceRepo: url,
      evidence: interestingConfigs,
      confidence: 0.7,
      applicableTo: ['tooling', 'developer-experience'],
    });
  }

  const topInsights = practices
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5)
    .map(p => p.title);

  const applicabilityScore = practices.length > 0
    ? practices.reduce((s, p) => s + p.confidence, 0) / practices.length
    : 0;

  return {
    sourceRepo: url,
    minedAt: new Date().toISOString(),
    practices,
    topInsights,
    applicabilityScore: Math.round(applicabilityScore * 100) / 100,
  };
}

export function mergeBestPractices(reports: BestPracticesReport[]): BestPractice[] {
  const seen = new Set<string>();
  const merged: BestPractice[] = [];

  for (const report of reports) {
    for (const p of report.practices) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        merged.push(p);
      }
    }
  }

  return merged.sort((a, b) => b.confidence - a.confidence);
}

function slugify(s: string): string {
  return s.replace(/[^a-z0-9]/gi, '-').toLowerCase().replace(/-+/g, '-').slice(0, 40);
}
