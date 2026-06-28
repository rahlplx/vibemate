import { describe, it, expect } from 'bun:test';
import {
  extractBestPractices,
  mergeBestPractices,
  type BestPracticesReport,
} from '../../src/learnings/best-practices.js';
import type { RepoMineResult } from '../../src/learnings/repo-miner.js';
import type { FolderAnalysis } from '../../src/learnings/folder-analyzer.js';
import type { CommitAnalysis } from '../../src/learnings/commit-analyzer.js';

function makeResult(overrides: Partial<RepoMineResult['analysis']> = {}): RepoMineResult {
  const folder: FolderAnalysis = {
    tree: { name: 'root', type: 'dir', children: [] },
    languages: { TypeScript: 42 },
    detectedPatterns: ['monorepo', 'feature-sliced'],
    testCoverage: 'present',
    configFiles: ['tsconfig.json', 'bun.lockb'],
  };

  const commits: CommitAnalysis = {
    totalCommits: 200,
    topContributors: [{ author: 'alice', count: 100 }, { author: 'bob', count: 50 }],
    commitFrequency: 'active',
    recentCommits: [],
    languagesFromDiffs: ['TypeScript'],
  };

  const analysis = {
    url: 'https://github.com/example/repo',
    clonedAt: new Date().toISOString(),
    languages: { TypeScript: 42 },
    fileCount: 80,
    commitCount: 200,
    topContributors: [{ author: 'alice', count: 100 }],
    hasTests: true,
    hasCI: true,
    packageManager: 'bun',
    detectedPatterns: ['monorepo'],
    configFiles: ['tsconfig.json'],
    ...overrides,
  };

  return {
    url: analysis.url,
    dbId: 'test-id',
    analysis,
    commits,
    folder,
    okfPath: null,
    jsonlRecordsWritten: 0,
  };
}

describe('extractBestPractices()', () => {
  it('returns a BestPracticesReport with required fields', () => {
    const report = extractBestPractices(makeResult());
    expect(typeof report.sourceRepo).toBe('string');
    expect(typeof report.minedAt).toBe('string');
    expect(Array.isArray(report.practices)).toBe(true);
    expect(Array.isArray(report.topInsights)).toBe(true);
    expect(typeof report.applicabilityScore).toBe('number');
  });

  it('detects testing practice when hasTests=true', () => {
    const report = extractBestPractices(makeResult({ hasTests: true }));
    expect(report.practices.some(p => p.category === 'testing')).toBe(true);
  });

  it('detects CI practice when hasCI=true', () => {
    const report = extractBestPractices(makeResult({ hasCI: true }));
    expect(report.practices.some(p => p.id.includes('ci'))).toBe(true);
  });

  it('detects lockfile practice when packageManager is set', () => {
    const report = extractBestPractices(makeResult({ packageManager: 'bun' }));
    expect(report.practices.some(p => p.category === 'security' && p.id.includes('lockfile'))).toBe(true);
  });

  it('omits CI practice when hasCI=false', () => {
    const report = extractBestPractices(makeResult({ hasCI: false }));
    expect(report.practices.some(p => p.id.includes('-ci'))).toBe(false);
  });

  it('applicabilityScore is between 0 and 1', () => {
    const report = extractBestPractices(makeResult());
    expect(report.applicabilityScore).toBeGreaterThanOrEqual(0);
    expect(report.applicabilityScore).toBeLessThanOrEqual(1);
  });

  it('topInsights is at most 5 items', () => {
    const report = extractBestPractices(makeResult());
    expect(report.topInsights.length).toBeLessThanOrEqual(5);
  });

  it('all practices have required fields', () => {
    const report = extractBestPractices(makeResult());
    for (const p of report.practices) {
      expect(typeof p.id).toBe('string');
      expect(typeof p.category).toBe('string');
      expect(typeof p.title).toBe('string');
      expect(typeof p.description).toBe('string');
      expect(typeof p.sourceRepo).toBe('string');
      expect(Array.isArray(p.evidence)).toBe(true);
      expect(typeof p.confidence).toBe('number');
      expect(p.confidence).toBeGreaterThanOrEqual(0);
      expect(p.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe('mergeBestPractices()', () => {
  it('deduplicates by id across reports', () => {
    const r1 = extractBestPractices(makeResult());
    const r2 = extractBestPractices(makeResult());
    const merged = mergeBestPractices([r1, r2]);
    const ids = merged.map(p => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('merges from multiple repos into one list', () => {
    const r1 = extractBestPractices(makeResult({ url: 'https://github.com/a/repo1' } as any));
    const r2 = extractBestPractices(makeResult({ url: 'https://github.com/b/repo2' } as any));
    const merged = mergeBestPractices([r1, r2]);
    const sources = new Set(merged.map(p => p.sourceRepo));
    expect(sources.size).toBeGreaterThanOrEqual(1);
  });

  it('returns empty array for empty input', () => {
    expect(mergeBestPractices([])).toEqual([]);
  });

  it('sorts by confidence descending', () => {
    const r1 = extractBestPractices(makeResult());
    const merged = mergeBestPractices([r1]);
    for (let i = 1; i < merged.length; i++) {
      expect(merged[i - 1].confidence).toBeGreaterThanOrEqual(merged[i].confidence);
    }
  });
});
