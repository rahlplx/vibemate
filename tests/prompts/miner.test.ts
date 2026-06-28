import { describe, it, expect } from 'bun:test';
import { PromptMiner, STATIC_MINED_PROMPTS } from '../../src/prompts/miner.js';

// ─── score ────────────────────────────────────────────────────────────────────

describe('PromptMiner — score()', () => {
  const miner = new PromptMiner();

  it('returns all entries with a numeric score', () => {
    const scored = miner.score(STATIC_MINED_PROMPTS, ['typescript']);
    expect(scored.length).toBe(STATIC_MINED_PROMPTS.length);
    for (const s of scored) expect(typeof s.score).toBe('number');
  });

  it('returns 0.5 for all entries when no tech stack provided', () => {
    const scored = miner.score(STATIC_MINED_PROMPTS, []);
    for (const s of scored) expect(s.score).toBe(0.5);
  });

  it('ranks entries containing query terms higher', () => {
    const scored = miner.score(STATIC_MINED_PROMPTS, ['performance', 'profiling']);
    const [top] = scored;
    expect(top.title.toLowerCase()).toContain('performance');
  });

  it('returns sorted order (highest score first)', () => {
    const scored = miner.score(STATIC_MINED_PROMPTS, ['typescript', 'testing']);
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    }
  });

  it('handles single-entry list without throwing', () => {
    const entries = [{ title: 'Single', content: 'Only one entry here.', tags: [] }];
    const scored = miner.score(entries, ['single']);
    expect(scored.length).toBe(1);
  });
});

// ─── mine (static, no network) ────────────────────────────────────────────────

describe('PromptMiner — mine() (no network)', () => {
  it('returns PromptTemplate objects with required fields', async () => {
    const miner = new PromptMiner();
    const results = await miner.mine({ techStack: ['typescript'] });
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(typeof r.template.id).toBe('string');
      expect(typeof r.template.name).toBe('string');
      expect(typeof r.template.content).toBe('string');
      expect(r.template.source).toBe('mined');
      expect(typeof r.relevanceScore).toBe('number');
    }
  });

  it('respects maxResults', async () => {
    const miner = new PromptMiner();
    const results = await miner.mine({ maxResults: 2 });
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('filters by minRelevance when techStack is provided', async () => {
    const miner = new PromptMiner();
    // With a very high minRelevance threshold, some may be excluded
    const results = await miner.mine({ techStack: ['typescript'], minRelevance: 9999 });
    expect(results.length).toBe(0);
  });

  it('mined templates start below built-in confidence (< 0.80)', async () => {
    const miner = new PromptMiner();
    const results = await miner.mine({ techStack: ['typescript'] });
    for (const r of results) {
      expect(r.template.confidence).toBeLessThan(0.80);
    }
  });

  it('generates unique ids for each result', async () => {
    const miner = new PromptMiner();
    // Run twice — ids should differ due to timestamp
    const r1 = await miner.mine({ maxResults: 5 });
    await new Promise(r => setTimeout(r, 2));
    const r2 = await miner.mine({ maxResults: 5 });
    const ids1 = new Set(r1.map(r => r.template.id));
    const ids2 = new Set(r2.map(r => r.template.id));
    // Ids from separate calls should not overlap (timestamp-based)
    const overlap = [...ids1].filter(id => ids2.has(id));
    expect(overlap.length).toBe(0);
  });

  it('gracefully skips unreachable remote sources', async () => {
    const mockFetch = async () => { throw new Error('Network error'); };
    const miner = new PromptMiner(mockFetch as typeof fetch);
    // Should still return static prompts even when fetch fails
    const results = await miner.mine({
      sources: [{ url: 'https://unreachable.example.com/prompts.json', format: 'json', category: 'role', trustScore: 0.9 }],
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it('skips remote sources returning non-200', async () => {
    const mockFetch = async () => new Response('Not Found', { status: 404 });
    const miner = new PromptMiner(mockFetch as typeof fetch);
    const results = await miner.mine({
      sources: [{ url: 'https://example.com/404.json', format: 'json', category: 'role', trustScore: 0.9 }],
    });
    expect(results.length).toBeGreaterThan(0); // static prompts still returned
  });

  it('incorporates remote entries when fetch succeeds', async () => {
    const remoteEntry = [{ title: 'Remote Prompt', content: 'A unique remote system prompt.' }];
    const mockFetch = async () =>
      new Response(JSON.stringify(remoteEntry), { status: 200, headers: { 'Content-Type': 'application/json' } });
    const miner = new PromptMiner(mockFetch as typeof fetch);
    const results = await miner.mine({
      sources: [{ url: 'https://example.com/prompts.json', format: 'json', category: 'role', trustScore: 0.9 }],
      maxResults: 100,
    });
    expect(results.some(r => r.template.name === 'Remote Prompt')).toBe(true);
  });
});

// ─── config field tests ───────────────────────────────────────────────────────

describe('PromptMiner — config fields in VibemateExtendedConfig', () => {
  it('loadConfig has default promptAutoEvolve=false', async () => {
    const { loadConfig } = await import('../../src/shared/config.js');
    const config = loadConfig('/tmp/no-such-vibemate-dir');
    expect(config.promptAutoEvolve).toBe(false);
    expect(config.promptEvolveCadence).toBe('weekly');
    expect(config.promptRoles).toEqual([]);
  });
});
