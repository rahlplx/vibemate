## 2025-05-18 - Lazy document caching and query term IDF memoization in BM25Store

**Learning:** Repeatedly tokenizing document text inside per-document/per-term scoring loops during BM25 search retrieval creates an $O(Q \times N^2 \times L)$ performance bottleneck. Pre-tokenizing documents lazily on demand into an index structure (`CachedBM25Doc`) and pre-computing global document frequencies (`dfMap`) and average document length (`avgdl`) reduces retrieval time from $O(Q \times N^2 \times L)$ to $O(Q \times N \times \text{terms})$, yielding a ~890x speedup.

**Action:** For search indexing structures, tokenize document contents once upon indexing/caching rather than dynamically re-tokenizing inside query retrieval scoring loops.
