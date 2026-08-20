import { describe, it, expect, beforeEach } from 'bun:test';
import { BM25Store, BM25Chunk } from '../../src/context/embeddings';

describe('BM25Store Performance', () => {
  let store: BM25Store;

  beforeEach(() => {
    store = new BM25Store();
  });

  it('retrieves relevant results accurately and in descending score order', () => {
    store.addDocs([
      { id: '1', content: 'Fast performance optimization for search indexing and retrieval', source: 'doc1.md' },
      { id: '2', content: 'Database connection pooling and query caching strategy', source: 'doc2.md' },
      { id: '3', content: 'Memory management and garbage collection tuning in JavaScript', source: 'doc3.md' },
    ]);

    const results = store.retrieve('search retrieval optimization', 2);
    expect(results).toHaveLength(2);
    expect(results[0].chunk.id).toBe('1');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('handles 100 queries across 100 documents in under 100ms', () => {
    const docs: BM25Chunk[] = [];
    for (let i = 0; i < 100; i++) {
      docs.push({
        id: `doc-${i}`,
        content: `Document sample ${i} containing technical keywords performance benchmark optimization index query ${i % 10}`,
        source: `sample-${i}.md`,
      });
    }
    store.addDocs(docs);

    const start = performance.now();
    for (let q = 0; q < 100; q++) {
      store.retrieve(`benchmark optimization query ${q % 10}`, 5);
    }
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
