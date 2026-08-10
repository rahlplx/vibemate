import { describe, it, expect } from 'bun:test';
import { BM25Store } from '../../src/context/embeddings';

describe('BM25Store Performance', () => {
  it('should scale efficiently with many documents', () => {
    const store = new BM25Store();
    const docCount = 500;
    const docs = [];

    // Seed the store with 500 documents
    for (let i = 0; i < docCount; i++) {
      docs.push({
        id: `doc-${i}`,
        content: `This is document number ${i} about software development, performance engineering, caching algorithms, and vector databases in TypeScript.`,
        source: `source-${i}`,
      });
    }

    const indexStart = performance.now();
    store.addDocs(docs);
    const indexDuration = performance.now() - indexStart;
    console.log(`\n    [BM25 Bench] Seeded ${docCount} documents in ${indexDuration.toFixed(2)}ms`);

    // Warm up and first retrieval
    const retrieveStart = performance.now();
    const query = 'performance engineering caching TypeScript';
    const results = store.retrieve(query, 5);
    const retrieveDuration = performance.now() - retrieveStart;

    console.log(`    [BM25 Bench] Retrieved top 5 matches for "${query}" in ${retrieveDuration.toFixed(2)}ms`);
    expect(results).toHaveLength(5);
    expect(results[0].score).toBeGreaterThan(0);

    // Run 50 search operations to test average query performance
    const startQueries = performance.now();
    const runs = 50;
    for (let i = 0; i < runs; i++) {
      store.retrieve('performance engineering caching TypeScript', 5);
    }
    const endQueries = performance.now();
    const totalQueryDuration = endQueries - startQueries;
    const avgQueryDuration = totalQueryDuration / runs;

    console.log(`    [BM25 Bench] Executed ${runs} searches in ${totalQueryDuration.toFixed(2)}ms (average: ${avgQueryDuration.toFixed(3)}ms per search)`);

    // Expect average query duration to be extremely fast (typically < 1ms)
    expect(avgQueryDuration).toBeLessThan(15); // Generous ceiling for CI pipelines
  });
});
