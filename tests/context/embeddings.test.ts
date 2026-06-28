import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { mkdirSync, rmSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  EmbeddingStore,
  BM25Store,
  localEmbedFn,
  cosineSimilarity,
  createOpenAICompatibleEmbedFn,
  createMemoryAdapter,
  createNodeAdapter,
  type EmbeddingChunk,
  type RetrievalResult,
  type BM25Chunk,
  type StorageAdapter,
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

  it('embedOKFChunks() normalizes path separators to forward slashes', async () => {
    const okfDir = join(TEMP_DIR, 'slash-test');
    mkdirSync(join(okfDir, 'sub'), { recursive: true });
    await writeFile(join(okfDir, 'sub', 'doc.md'), '# Doc\n\nSome content here for the test.', 'utf-8');
    const store = new EmbeddingStore(TEMP_DIR);
    const chunks = await store.embedOKFChunks(okfDir);
    expect(chunks.some(c => c.source.includes('\\'))).toBe(false);
  });
});

describe('cosineSimilarity() — dimension guard', () => {
  it('throws when vectors have different lengths', () => {
    expect(() => cosineSimilarity([1, 2, 3], [1, 2])).toThrow('dimension mismatch');
  });

  it('does not throw for vectors of equal length', () => {
    expect(() => cosineSimilarity([1, 0], [0, 1])).not.toThrow();
  });
});

describe('BM25Store', () => {
  it('retrieve() returns empty array when no docs loaded', () => {
    const store = new BM25Store();
    expect(store.retrieve('query')).toEqual([]);
  });

  it('retrieve() returns most relevant doc first', () => {
    const store = new BM25Store();
    store.addDocs([
      { id: 'a', content: 'TypeScript configuration and tsconfig setup', source: 'a.md' },
      { id: 'b', content: 'Docker deployment and container orchestration', source: 'b.md' },
    ]);
    const results = store.retrieve('TypeScript config');
    expect(results[0].chunk.id).toBe('a');
  });

  it('retrieve() orders results by score descending', () => {
    const store = new BM25Store();
    store.addDocs([
      { id: 'a', content: 'TypeScript configuration setup', source: 'a.md' },
      { id: 'b', content: 'Docker container deployment', source: 'b.md' },
      { id: 'c', content: 'TypeScript types and interfaces guide', source: 'c.md' },
    ]);
    const results = store.retrieve('TypeScript');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('retrieve() returns at most topK results', () => {
    const store = new BM25Store();
    store.addDocs(
      ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({
        id,
        content: `document ${id} with some content here`,
        source: `${i}.md`,
      }))
    );
    expect(store.retrieve('document content', 2).length).toBe(2);
  });

  it('retrieve() defaults to top 3', () => {
    const store = new BM25Store();
    store.addDocs(
      ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, content: `doc ${id}`, source: `${id}.md` }))
    );
    expect(store.retrieve('doc').length).toBe(3);
  });

  it('addDocs() accumulates documents', () => {
    const store = new BM25Store();
    store.addDocs([{ id: '1', content: 'first', source: 'a.md' }]);
    store.addDocs([{ id: '2', content: 'second', source: 'b.md' }]);
    expect(store.getDocs().length).toBe(2);
  });

  it('getDocs() returns all indexed documents', () => {
    const store = new BM25Store();
    store.addDocs([
      { id: '1', content: 'first doc', source: 'a.md' },
      { id: '2', content: 'second doc', source: 'b.md' },
    ]);
    expect(store.getDocs().length).toBe(2);
  });

  it('tokenize() lowercases and splits on non-word chars', () => {
    const store = new BM25Store();
    expect(store.tokenize('Hello, World! TypeScript.')).toEqual(['hello', 'world', 'typescript']);
  });

  it('indexDir() processes markdown files and returns chunk count', async () => {
    const bm25Dir = join(TEMP_DIR, 'bm25-index');
    mkdirSync(bm25Dir, { recursive: true });
    await writeFile(
      join(bm25Dir, 'arch.md'),
      '# Architecture\n\nTypeScript monorepo with modular design.\n\n## Modules\n\nContext pipeline for LLM preparation.',
      'utf-8'
    );
    const store = new BM25Store();
    const count = await store.indexDir(bm25Dir);
    expect(count).toBeGreaterThan(0);
    expect(store.getDocs().length).toBe(count);
  });

  it('indexDir() returns 0 for non-existent directory', async () => {
    const store = new BM25Store();
    const count = await store.indexDir('/tmp/bm25-nonexistent-xyz-999');
    expect(count).toBe(0);
  });

  it('indexDir() normalizes path separators to forward slashes', async () => {
    const bm25Dir = join(TEMP_DIR, 'bm25-slash');
    mkdirSync(join(bm25Dir, 'sub'), { recursive: true });
    await writeFile(join(bm25Dir, 'sub', 'doc.md'), '# Sub\n\nContent here for slash test.', 'utf-8');
    const store = new BM25Store();
    await store.indexDir(bm25Dir);
    expect(store.getDocs().some(d => d.source.includes('\\'))).toBe(false);
  });

  it('scores exact-term match higher than zero-term match', () => {
    const store = new BM25Store();
    store.addDocs([
      { id: 'match', content: 'bun test runner configuration setup', source: 'a.md' },
      { id: 'nomatch', content: 'completely unrelated gardening tips', source: 'b.md' },
    ]);
    const results = store.retrieve('bun test');
    expect(results[0].chunk.id).toBe('match');
    expect(results[0].score).toBeGreaterThan(0);
  });
});

describe('createOpenAICompatibleEmbedFn()', () => {
  it('returns a callable EmbedFn', () => {
    const fn = createOpenAICompatibleEmbedFn({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'test-key',
      model: 'text-embedding-3-small',
    });
    expect(typeof fn).toBe('function');
  });

  it('calls the correct endpoint with Authorization header', async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const mockFetch = async (url: string, opts: RequestInit) => {
      calls.push({ url, headers: opts.headers as Record<string, string> });
      return new Response(JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3] }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };
    const orig = global.fetch;
    global.fetch = mockFetch as typeof fetch;

    const fn = createOpenAICompatibleEmbedFn({
      baseUrl: 'https://api.openai.com/v1',
      apiKey: 'sk-test',
      model: 'text-embedding-3-small',
    });
    await fn('hello world');

    global.fetch = orig;
    expect(calls[0].url).toBe('https://api.openai.com/v1/embeddings');
    expect(calls[0].headers['Authorization']).toBe('Bearer sk-test');
  });

  it('returns the embedding vector from the API response', async () => {
    const expected = [0.1, 0.5, 0.9];
    const mockFetch = async () =>
      new Response(JSON.stringify({ data: [{ embedding: expected }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    const orig = global.fetch;
    global.fetch = mockFetch as typeof fetch;

    const fn = createOpenAICompatibleEmbedFn({ baseUrl: 'http://x', apiKey: 'k', model: 'm' });
    const result = await fn('test input');

    global.fetch = orig;
    expect(result).toEqual(expected);
  });

  it('throws on non-ok HTTP response', async () => {
    const mockFetch = async () =>
      new Response('Unauthorized', { status: 401 });
    const orig = global.fetch;
    global.fetch = mockFetch as typeof fetch;

    const fn = createOpenAICompatibleEmbedFn({ baseUrl: 'http://x', apiKey: 'bad', model: 'm' });
    await expect(fn('text')).rejects.toThrow('401');

    global.fetch = orig;
  });
});

describe('createMemoryAdapter()', () => {
  it('reads a seeded key', async () => {
    const adapter = createMemoryAdapter({ 'docs/a.md': '# Hello\n\nworld' });
    expect(await adapter.read('docs/a.md')).toBe('# Hello\n\nworld');
  });

  it('throws ENOENT for missing key', async () => {
    const adapter = createMemoryAdapter();
    await expect(adapter.read('missing.md')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('write() stores a value that can then be read', async () => {
    const adapter = createMemoryAdapter();
    await adapter.write('key.md', 'value');
    expect(await adapter.read('key.md')).toBe('value');
  });

  it('ensureDir() is a no-op and does not throw', async () => {
    const adapter = createMemoryAdapter();
    await expect(adapter.ensureDir('some/dir')).resolves.toBeUndefined();
  });

  it('listMdFiles() returns only .md files under the given dir prefix', async () => {
    const adapter = createMemoryAdapter({
      'docs/a.md': '# A\n\ncontent',
      'docs/b.md': '# B\n\ncontent',
      'docs/ignore.txt': 'not md',
      'other/c.md': '# C\n\ncontent',
    });
    const files = await adapter.listMdFiles('docs');
    expect(files.map(f => f.source).sort()).toEqual(['a.md', 'b.md']);
  });

  it('listMdFiles() normalizes path separators in source', async () => {
    const adapter = createMemoryAdapter({ 'docs/sub/deep.md': '# D\n\ncontent' });
    const files = await adapter.listMdFiles('docs');
    expect(files.some(f => f.source.includes('\\'))).toBe(false);
  });

  it('listMdFiles() returns key for read() and relative source', async () => {
    const adapter = createMemoryAdapter({ 'docs/x.md': '# X\n\ncontent' });
    const [file] = await adapter.listMdFiles('docs');
    expect(file.key).toBe('docs/x.md');
    expect(file.source).toBe('x.md');
  });

  it('EmbeddingStore + memory adapter round-trips without Node I/O', async () => {
    const adapter = createMemoryAdapter();
    const store = new EmbeddingStore('vibe', localEmbedFn, adapter);
    const chunk = await store.embedChunk('edge-safe content', 'edge.md');
    store.addChunks([chunk]);
    await store.save();

    const store2 = new EmbeddingStore('vibe', localEmbedFn, adapter);
    const loaded = await store2.load();
    expect(loaded).toBe(true);
    expect(store2.getChunks()[0].content).toBe('edge-safe content');
  });

  it('BM25Store + memory adapter indexes and retrieves without Node I/O', async () => {
    const adapter = createMemoryAdapter({
      'docs/ts.md': '# TypeScript\n\nTypescript configuration and setup guide for modern projects.',
    });
    const store = new BM25Store(adapter);
    const count = await store.indexDir('docs');
    expect(count).toBeGreaterThan(0);
    const results = store.retrieve('TypeScript configuration');
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('createNodeAdapter()', () => {
  it('returns an object with the StorageAdapter interface', () => {
    const adapter = createNodeAdapter();
    expect(typeof adapter.read).toBe('function');
    expect(typeof adapter.write).toBe('function');
    expect(typeof adapter.ensureDir).toBe('function');
    expect(typeof adapter.listMdFiles).toBe('function');
  });

  it('write() + read() round-trips a file on disk', async () => {
    const adapter = createNodeAdapter();
    const key = join(TEMP_DIR, `node-adapter-${Date.now()}.txt`);
    await adapter.write(key, 'node-written');
    expect(await adapter.read(key)).toBe('node-written');
  });

  it('read() throws for a missing file', async () => {
    const adapter = createNodeAdapter();
    await expect(adapter.read('/tmp/vibemate-nonexistent-xyz.txt')).rejects.toThrow();
  });

  it('ensureDir() creates the directory recursively', async () => {
    const adapter = createNodeAdapter();
    const dir = join(TEMP_DIR, `node-ensure-${Date.now()}`, 'nested');
    await adapter.ensureDir(dir);
    const { stat } = await import('fs/promises');
    const s = await stat(dir);
    expect(s.isDirectory()).toBe(true);
  });

  it('listMdFiles() finds .md files recursively and normalizes separators', async () => {
    const adapter = createNodeAdapter();
    const dir = join(TEMP_DIR, `node-list-${Date.now()}`);
    const { mkdir, writeFile: wf } = await import('fs/promises');
    await mkdir(join(dir, 'sub'), { recursive: true });
    await wf(join(dir, 'a.md'), '# A\n\ncontent', 'utf-8');
    await wf(join(dir, 'sub', 'b.md'), '# B\n\ncontent', 'utf-8');
    await wf(join(dir, 'ignore.txt'), 'not md', 'utf-8');

    const files = await adapter.listMdFiles(dir);
    const sources = files.map(f => f.source).sort();
    expect(sources).toEqual(['a.md', 'sub/b.md']);
    expect(files.some(f => f.source.includes('\\'))).toBe(false);
  });
});
