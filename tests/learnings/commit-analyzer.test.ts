import { describe, it, expect } from 'bun:test';
import { analyzeCommits, type CommitAnalysis } from '../../src/learnings/commit-analyzer.js';

describe('analyzeCommits', () => {
  it('returns empty analysis for non-git directory', () => {
    const result = analyzeCommits('/tmp', 10);
    expect(result.totalCommits).toBe(0);
    expect(result.topContributors).toEqual([]);
    expect(result.commitFrequency).toBe('stale');
    expect(result.recentCommits).toEqual([]);
    expect(result.languagesFromDiffs).toEqual([]);
  });

  it('parses real git log from cwd', () => {
    const repoRoot = process.cwd();
    const result = analyzeCommits(repoRoot, 50);
    expect(result.totalCommits).toBeGreaterThan(0);
    expect(result.topContributors.length).toBeGreaterThan(0);
    expect(result.topContributors[0]).toHaveProperty('author');
    expect(result.topContributors[0]).toHaveProperty('count');
  });

  it('sorts contributors by commit count descending', () => {
    const result = analyzeCommits(process.cwd(), 100);
    const counts = result.topContributors.map(c => c.count);
    for (let i = 0; i < counts.length - 1; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i + 1]);
    }
  });

  it('caps topContributors at 10', () => {
    const result = analyzeCommits(process.cwd(), 200);
    expect(result.topContributors.length).toBeLessThanOrEqual(10);
  });

  it('caps recentCommits at 20', () => {
    const result = analyzeCommits(process.cwd(), 200);
    expect(result.recentCommits.length).toBeLessThanOrEqual(20);
  });

  it('recentCommit entries have required fields', () => {
    const result = analyzeCommits(process.cwd(), 5);
    if (result.recentCommits.length > 0) {
      const commit = result.recentCommits[0];
      expect(commit).toHaveProperty('hash');
      expect(commit).toHaveProperty('author');
      expect(commit).toHaveProperty('date');
      expect(commit).toHaveProperty('message');
      expect(commit).toHaveProperty('filesChanged');
      expect(commit).toHaveProperty('insertions');
      expect(commit).toHaveProperty('deletions');
    }
  });

  it('commitFrequency returns valid enum value', () => {
    const result = analyzeCommits(process.cwd(), 20);
    expect(['active', 'moderate', 'stale']).toContain(result.commitFrequency);
  });

  it('languagesFromDiffs is an array of strings', () => {
    const result = analyzeCommits(process.cwd(), 10);
    expect(Array.isArray(result.languagesFromDiffs)).toBe(true);
    for (const lang of result.languagesFromDiffs) {
      expect(typeof lang).toBe('string');
    }
  });
});
