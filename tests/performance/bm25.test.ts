import { describe, expect, it } from 'bun:test';
import { BM25Store } from '../../src/context/embeddings';

describe('BM25Store performance & scaling test', () => {
  it('handles retrieval over 500 documents rapidly', () => {
    const store = new BM25Store();
    const docs = [];
    for (let i = 0; i < 500; i++) {
      docs.push({
        id: `doc_${i}`,
        content: `Document index ${i} discussing software engineering principles, algorithms, data structures, TypeScript performance optimization, caching strategies, and retrieval search with BM25 Okapi algorithm section ${i % 10}.`,
        source: `file_${i}.md`,
      });
    }
    store.addDocs(docs);

    const start = performance.now();
    const queryCount = 20;
    for (let q = 0; q < queryCount; q++) {
      const results = store.retrieve('typescript performance optimization caching', 5);
      expect(results.length).toBeGreaterThan(0);
    }
    const duration = performance.now() - start;

    // With optimization, 20 queries across 500 documents takes ~10-20ms (previously >50,000ms)
    expect(duration).toBeLessThan(1000);
  });
});
