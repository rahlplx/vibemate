import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, rmSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  EmbeddingStore,
  localEmbedFn,
  cosineSimilarity,
  type EmbeddingChunk,
  type RetrievalResult,
} from '../../src/context/embeddings.js';

const TEMP_DIR = join(tmpdir(), `vibemate-embed-test-${Date.now()}`);

beforeAll(() => mkdirSync(TEMP_DIR, { recursive: true }));
afterAll(() => rmSync(TEMP_DIR, { recursive: true, force: true }));

describe('localEmbedFn()', () => {
  it('returns a number array', () => {
    expect(Array.isArray(localEmbedFn('hello world'))).toBe(true);
  });

  it('returns a fixed-size vector for any input', () => {
    const v1 = localEmbedFn('hello');
    const v2 = localEmbedFn('a completely different piece of text for testing purposes');
    expect(v1.length).toBe(v2.length);
    expect(v1.length).toBeGreaterThan(0);
  });

  it('produces the same embedding for the same text', () => {
    const v1 = localEmbedFn('deterministic test input');
    const v2 = localEmbedFn('deterministic test input');
    expect(v1).toEqual(v2);
  });

  it('produces different embeddings for different text', () => {
    const v1 = localEmbedFn('typescript configuration');
    const v2 = localEmbedFn('docker deployment container');
    expect(v1).not.toEqual(v2);
  });

  it('returns a unit-length (L2-normalized) vector', () => {
    const v = localEmbedFn('some text to embed for norm test');
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(Math.abs(norm - 1)).toBeLessThan(0.0001);
  });

  it('handles empty string without throwing', () => {
    expect(() => localEmbedFn('')).not.toThrow();
  });
});

describe('cosineSimilarity()', () => {
  it('returns 1.0 for identical unit vectors', () => {
    const v = localEmbedFn('same text here');
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
  });

  it('returns 0 for two zero vectors', () => {
    const a = new Array(256).fill(0);
    const b = new Array(256).fill(0);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  it('returns a value between -1 and 1', () => {
    const a = localEmbedFn('hello world');
    const b = localEmbedFn('typescript code patterns');
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThanOrEqual(-1);
    expect(sim).toBeLessThanOrEqual(1.0001);
  });

  it('is symmetric', () => {
    const a = localEmbedFn('hello world');
    const b = localEmbedFn('typescript patterns');
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });

  it('scores similar texts higher than dissimilar ones', () => {
    const q = localEmbedFn('typescript config');
    const similar = localEmbedFn('typescript configuration settings');
    const dissimilar = localEmbedFn('docker container deployment');
    expect(cosineSimilarity(q, similar)).toBeGreaterThan(cosineSimilarity(q, dissimilar));
  });
});

describe('EmbeddingStore', () => {
  it('embedChunk() returns a valid EmbeddingChunk', async () => {
    const store = new EmbeddingStore(TEMP_DIR);
    const chunk = await store.embedChunk('Some content here', 'test.md');
    expect(typeof chunk.id).toBe('string');
    expect(chunk.id.length).toBeGreaterThan(0);
    expect(typeof chunk.content).toBe('string');
    expect(chunk.content).toBe('Some content here');
    expect(typeof chunk.source).toBe('string');
    expect(typeof chunk.hash).toBe('string');
    expect(Array.isArray(chunk.embedding)).toBe(true);
    expect(chunk.embedding.length).toBeGreaterThan(0);
  });

  it('embedChunk() hash changes with content', async () => {
    const store = new EmbeddingStore(TEMP_DIR);
    const c1 = await store.embedChunk('content one', 'a.md');
    const c2 = await store.embedChunk('content two', 'a.md');
    expect(c1.hash).not.toBe(c2.hash);
  });

  it('embedChunk() id encodes source and hash', async () => {
    const store = new EmbeddingStore(TEMP_DIR);
    const chunk = await store.embedChunk('content', 'src/design.md');
    expect(chunk.id).toContain('src/design.md');
    expect(chunk.id).toContain(chunk.hash);
  });

  it('retrieve() returns empty array when no chunks loaded', async () => {
    const store = new EmbeddingStore(join(TEMP_DIR, 'empty'));
    const results = await store.retrieve('some query');
    expect(results).toEqual([]);
  });

  it('retrieve() returns at most topK results', async () => {
    const store = new EmbeddingStore(TEMP_DIR);
    const chunks = await Promise.all(
      ['alpha', 'beta', 'gamma', 'delta', 'epsilon'].map((w, i) =>
        store.embedChunk(`${w} content chunk`, `${i}.md`)
      )
    );
    store.addChunks(chunks);
    const results = await store.retrieve('query text', 3);
    expect(results.length).toBe(3);
  });

  it('retrieve() defaults to top 3', async () => {
    const store = new EmbeddingStore(TEMP_DIR);
    const chunks = await Promise.all(
      ['a', 'b', 'c', 'd', 'e'].map((w, i) =>
        store.embedChunk(`${w} content`, `${i}.md`)
      )
    );
    store.addChunks(chunks);
    const results = await store.retrieve('query');
    expect(results.length).toBe(3);
  });

  it('retrieve() orders results by score descending', async () => {
    const store = new EmbeddingStore(TEMP_DIR);
    const chunks = await Promise.all([
      store.embedChunk('TypeScript configuration', 'a.md'),
      store.embedChunk('Docker deployment container', 'b.md'),
      store.embedChunk('TypeScript types and interfaces', 'c.md'),
    ]);
    store.addChunks(chunks);
    const results = await store.retrieve('TypeScript');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('retrieve() returns most relevant chunk first for matching query', async () => {
    const store = new EmbeddingStore(TEMP_DIR);
    const c1 = await store.embedChunk('TypeScript configuration and setup guide', 'ts-config.md');
    const c2 = await store.embedChunk('Docker deployment and container orchestration', 'docker.md');
    store.addChunks([c1, c2]);
    const results = await store.retrieve('TypeScript setup');
    expect(results[0].chunk.source).toBe('ts-config.md');
  });

  it('retrieve() result scores are between -1 and 1', async () => {
    const store = new EmbeddingStore(TEMP_DIR);
    const chunk = await store.embedChunk('test content for scoring', 'test.md');
    store.addChunks([chunk]);
    const results = await store.retrieve('test');
    for (const r of results) {
      expect(r.score).toBeGreaterThanOrEqual(-1);
      expect(r.score).toBeLessThanOrEqual(1.0001);
    }
  });

  it('save() and load() round-trips chunks faithfully', async () => {
    const dir = join(TEMP_DIR, 'roundtrip');
    const storeA = new EmbeddingStore(dir);
    const chunk = await storeA.embedChunk('persistent content for round-trip test', 'persist.md');
    storeA.addChunks([chunk]);
    await storeA.save();

    const storeB = new EmbeddingStore(dir);
    const loaded = await storeB.load();
    expect(loaded).toBe(true);
    expect(storeB.getChunks().length).toBe(1);
    expect(storeB.getChunks()[0].content).toBe('persistent content for round-trip test');
    expect(storeB.getChunks()[0].embedding.length).toBeGreaterThan(0);
    expect(storeB.getChunks()[0].hash).toBe(chunk.hash);
  });

  it('load() returns false when no saved embeddings exist', async () => {
    const store = new EmbeddingStore(join(TEMP_DIR, `nonexistent-${Date.now()}`));
    const result = await store.load();
    expect(result).toBe(false);
  });

  it('getChunks() returns all added chunks', async () => {
    const store = new EmbeddingStore(TEMP_DIR);
    const c1 = await store.embedChunk('first chunk', 'a.md');
    const c2 = await store.embedChunk('second chunk', 'b.md');
    store.addChunks([c1, c2]);
    expect(store.getChunks().length).toBe(2);
  });

  it('embedOKFChunks() processes markdown files and returns chunks', async () => {
    const okfDir = join(TEMP_DIR, 'okf-test');
    mkdirSync(okfDir, { recursive: true });
    await writeFile(
      join(okfDir, 'design.md'),
      '# Architecture\n\nThis is a TypeScript monorepo with multiple modules.\n\n## Modules\n\nContext pipeline handles compression and DLP masking.',
      'utf-8'
    );

    const store = new EmbeddingStore(TEMP_DIR);
    const chunks = await store.embedOKFChunks(okfDir);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every(c => Array.isArray(c.embedding) && c.embedding.length > 0)).toBe(true);
    expect(chunks.every(c => typeof c.source === 'string')).toBe(true);
  });

  it('embedOKFChunks() returns empty array for non-existent directory', async () => {
    const store = new EmbeddingStore(TEMP_DIR);
    const chunks = await store.embedOKFChunks('/tmp/definitely-does-not-exist-xyz-12345');
    expect(chunks).toEqual([]);
  });

  it('addChunks() appends to existing chunks', async () => {
    const store = new EmbeddingStore(TEMP_DIR);
    const c1 = await store.embedChunk('first', 'a.md');
    store.addChunks([c1]);
    const c2 = await store.embedChunk('second', 'b.md');
    store.addChunks([c2]);
    expect(store.getChunks().length).toBe(2);
  });

  it('retrieve() with custom embedFn uses it for query embedding', async () => {
    const calls: string[] = [];
    const spyEmbedFn = (text: string) => {
      calls.push(text);
      return localEmbedFn(text);
    };
    const store = new EmbeddingStore(TEMP_DIR, spyEmbedFn);
    const chunk = await store.embedChunk('some content', 'a.md');
    store.addChunks([chunk]);
    await store.retrieve('query text');
    expect(calls).toContain('query text');
  });
});
