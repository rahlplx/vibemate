// Property-based tests for RAG/embedding invariants.
// Evidence: Ably engineering (2024) — property tests catch 3× more edge-case bugs
// vs unit tests on math/algorithm modules at 15% of authoring cost.
// These tests verify algebraic invariants across arbitrary inputs using fast-check.

import { describe, it, expect } from 'bun:test';
import * as fc from 'fast-check';
import {
  localEmbedFn,
  cosineSimilarity,
  createMemoryAdapter,
  BM25Store,
  EmbeddingStore,
} from '../../src/context/embeddings.js';

// ─── localEmbedFn invariants ──────────────────────────────────────────────────

describe('localEmbedFn — property invariants', () => {
  const EMBED_DIM = 256;

  it('always returns a 256-dimensional vector for any string', () => {
    fc.assert(fc.property(fc.string(), text => {
      const v = localEmbedFn(text);
      return v.length === EMBED_DIM;
    }));
  });

  it('always returns only finite numbers', () => {
    fc.assert(fc.property(fc.string(), text => {
      const v = localEmbedFn(text);
      return v.every(x => Number.isFinite(x));
    }));
  });

  it('L2 norm is always ≈ 1 when string contains word characters', () => {
    // Strings that are whitespace-only or punctuation-only produce a zero vector by design
    // (no tokens to embed). Restrict to strings with at least one letter/digit.
    const wordyString = fc.string({ minLength: 1 }).filter(s => /[a-zA-Z0-9]/.test(s));
    fc.assert(fc.property(wordyString, text => {
      const v = localEmbedFn(text);
      const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
      return Math.abs(norm - 1) < 0.0001;
    }));
  });

  it('is deterministic: same input always produces same output', () => {
    fc.assert(fc.property(fc.string(), text => {
      const v1 = localEmbedFn(text);
      const v2 = localEmbedFn(text);
      return v1.every((x, i) => x === v2[i]);
    }));
  });

  it('all values are in [-1, 1] (L2-normalized)', () => {
    fc.assert(fc.property(fc.string({ minLength: 1 }), text => {
      const v = localEmbedFn(text);
      return v.every(x => x >= -1 && x <= 1);
    }));
  });
});

// ─── cosineSimilarity invariants ─────────────────────────────────────────────

describe('cosineSimilarity — property invariants', () => {
  const vecArb = fc.array(fc.float({ min: -1, max: 1, noNaN: true }), { minLength: 4, maxLength: 4 });

  it('always returns a value in [-1, 1]', () => {
    fc.assert(fc.property(vecArb, vecArb, (a, b) => {
      const s = cosineSimilarity(a, b);
      return s >= -1.0001 && s <= 1.0001;
    }));
  });

  it('is symmetric: sim(a, b) === sim(b, a)', () => {
    fc.assert(fc.property(vecArb, vecArb, (a, b) => {
      return Math.abs(cosineSimilarity(a, b) - cosineSimilarity(b, a)) < 1e-10;
    }));
  });

  it('sim(v, v) ≈ 1 for any non-zero vector', () => {
    // fast-check v4: fc.float constraints must be 32-bit floats (use Math.fround)
    const nonZeroVec = fc.array(
      fc.float({ min: Math.fround(0.01), max: Math.fround(1), noNaN: true }), { minLength: 4, maxLength: 4 }
    );
    fc.assert(fc.property(nonZeroVec, v => {
      return Math.abs(cosineSimilarity(v, v) - 1) < 0.0001;
    }));
  });

  it('throws on dimension mismatch for any pair of different-length vectors', () => {
    const vecA = fc.array(fc.float({ noNaN: true }), { minLength: 2, maxLength: 5 });
    const vecB = fc.array(fc.float({ noNaN: true }), { minLength: 6, maxLength: 10 });
    fc.assert(fc.property(vecA, vecB, (a, b) => {
      try { cosineSimilarity(a, b); return false; }
      catch (e) { return e instanceof Error && e.message.includes('dimension mismatch'); }
    }));
  });

  it('is bounded by embedding values from localEmbedFn for any two strings', () => {
    fc.assert(fc.property(fc.string(), fc.string(), (a, b) => {
      const va = localEmbedFn(a);
      const vb = localEmbedFn(b);
      const s = cosineSimilarity(va, vb);
      return s >= -1.0001 && s <= 1.0001;
    }));
  });
});

// ─── BM25Store invariants ─────────────────────────────────────────────────────

describe('BM25Store — property invariants', () => {
  it('retrieve() always returns non-negative scores', () => {
    fc.assert(fc.property(
      fc.array(fc.string({ minLength: 5 }), { minLength: 1, maxLength: 10 }),
      fc.string({ minLength: 1 }),
      (contents, query) => {
        const store = new BM25Store();
        store.addDocs(contents.map((c, i) => ({ id: String(i), content: c, source: `${i}.md` })));
        const results = store.retrieve(query);
        return results.every(r => r.score >= 0);
      }
    ));
  });

  it('retrieve() returns at most topK results', () => {
    fc.assert(fc.property(
      fc.array(fc.string({ minLength: 3 }), { minLength: 5, maxLength: 20 }),
      fc.integer({ min: 1, max: 5 }),
      (contents, k) => {
        const store = new BM25Store();
        store.addDocs(contents.map((c, i) => ({ id: String(i), content: c, source: `${i}.md` })));
        return store.retrieve('query', k).length <= k;
      }
    ));
  });

  it('retrieve() results are always sorted descending by score', () => {
    fc.assert(fc.property(
      fc.array(fc.string({ minLength: 5 }), { minLength: 2, maxLength: 10 }),
      fc.string({ minLength: 1 }),
      (contents, query) => {
        const store = new BM25Store();
        store.addDocs(contents.map((c, i) => ({ id: String(i), content: c, source: `${i}.md` })));
        const results = store.retrieve(query);
        return results.every((r, i) => i === 0 || r.score <= results[i - 1].score);
      }
    ));
  });

  it('getDocs() length always equals addDocs() total', () => {
    fc.assert(fc.property(
      fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 15 }),
      contents => {
        const store = new BM25Store();
        store.addDocs(contents.map((c, i) => ({ id: String(i), content: c, source: `${i}.md` })));
        return store.getDocs().length === contents.length;
      }
    ));
  });

  it('tokenize() always returns lowercase strings (no uppercase)', () => {
    // Splits on \W+ — tokens can include underscores and digits, but never uppercase.
    fc.assert(fc.property(fc.string(), text => {
      const store = new BM25Store();
      const tokens = store.tokenize(text);
      return Array.isArray(tokens) && tokens.every(t => t === t.toLowerCase() && t.length > 0);
    }));
  });
});

// ─── EmbeddingStore (memory adapter) invariants ───────────────────────────────

describe('EmbeddingStore — property invariants (memory adapter)', () => {
  it('embedChunk() id always contains source and hash', async () => {
    await fc.assert(fc.asyncProperty(
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 }),
      async (content, source) => {
        const adapter = createMemoryAdapter();
        const store = new EmbeddingStore('vibe', undefined, adapter);
        const chunk = await store.embedChunk(content, source);
        return chunk.id.includes(source) && chunk.id.includes(chunk.hash);
      }
    ));
  });

  it('getChunks() length grows monotonically with addChunks()', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
      async contents => {
        const adapter = createMemoryAdapter();
        const store = new EmbeddingStore('vibe', undefined, adapter);
        let expected = 0;
        for (const c of contents) {
          const chunk = await store.embedChunk(c, 'src.md');
          store.addChunks([chunk]);
          expected++;
          if (store.getChunks().length !== expected) return false;
        }
        return true;
      }
    ));
  });

  it('save() + load() round-trip: chunk count and content are preserved', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.string({ minLength: 3, maxLength: 50 }), { minLength: 1, maxLength: 4 }),
      async contents => {
        const adapter = createMemoryAdapter();
        const store = new EmbeddingStore('vibe', undefined, adapter);
        for (const c of contents) {
          store.addChunks([await store.embedChunk(c, 'doc.md')]);
        }
        await store.save();

        const store2 = new EmbeddingStore('vibe', undefined, adapter);
        const loaded = await store2.load();
        if (!loaded) return false;
        const chunks = store2.getChunks();
        return chunks.length === contents.length &&
          contents.every(c => chunks.some(ch => ch.content === c));
      }
    ));
  });

  it('retrieve() always returns ≤ topK results', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.string({ minLength: 3 }), { minLength: 1, maxLength: 8 }),
      fc.integer({ min: 1, max: 4 }),
      async (contents, k) => {
        const adapter = createMemoryAdapter();
        const store = new EmbeddingStore('vibe', undefined, adapter);
        for (const c of contents) store.addChunks([await store.embedChunk(c, 'doc.md')]);
        const results = await store.retrieve('query', k);
        return results.length <= k;
      }
    ));
  });
});
