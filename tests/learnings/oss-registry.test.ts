import { describe, it, expect } from 'bun:test';
import {
  OSS_REGISTRY,
  getHighPriorityRepos,
  getReposByPattern,
  getRepoUrls,
  type OSSEntry,
} from '../../src/learnings/oss-registry.js';

describe('OSS_REGISTRY shape', () => {
  it('is non-empty', () => {
    expect(OSS_REGISTRY.length).toBeGreaterThan(0);
  });

  it('every entry has required fields', () => {
    for (const entry of OSS_REGISTRY) {
      expect(typeof entry.url).toBe('string');
      expect(entry.url.startsWith('https://')).toBe(true);
      expect(typeof entry.description).toBe('string');
      expect(Array.isArray(entry.teachesPatterns)).toBe(true);
      expect(entry.teachesPatterns.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(entry.priority);
      expect(typeof entry.language).toBe('string');
    }
  });

  it('has at least one high-priority MCP entry', () => {
    const mcp = OSS_REGISTRY.filter(e =>
      e.teachesPatterns.includes('mcp-protocol') && e.priority === 'high'
    );
    expect(mcp.length).toBeGreaterThan(0);
  });

  it('has no duplicate URLs', () => {
    const urls = OSS_REGISTRY.map(e => e.url);
    const unique = new Set(urls);
    expect(unique.size).toBe(urls.length);
  });
});

describe('getHighPriorityRepos()', () => {
  it('returns only high-priority entries', () => {
    const high = getHighPriorityRepos();
    expect(high.length).toBeGreaterThan(0);
    expect(high.every(e => e.priority === 'high')).toBe(true);
  });

  it('includes the MCP SDK', () => {
    const high = getHighPriorityRepos();
    expect(high.some(e => e.url.includes('modelcontextprotocol'))).toBe(true);
  });
});

describe('getReposByPattern()', () => {
  it('returns repos teaching a given pattern', () => {
    const results = getReposByPattern('mcp-protocol');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(e => e.teachesPatterns.includes('mcp-protocol'))).toBe(true);
  });

  it('returns empty array for unknown pattern', () => {
    expect(getReposByPattern('nonexistent-pattern-xyz')).toEqual([]);
  });
});

describe('getRepoUrls()', () => {
  it('returns all URLs when no priority filter', () => {
    expect(getRepoUrls().length).toBe(OSS_REGISTRY.length);
  });

  it('returns only high-priority URLs when filtered', () => {
    const highUrls = getRepoUrls('high');
    const highEntries = getHighPriorityRepos();
    expect(highUrls).toEqual(highEntries.map(e => e.url));
  });

  it('every URL is a valid https string', () => {
    for (const url of getRepoUrls()) {
      expect(url.startsWith('https://')).toBe(true);
    }
  });
});
