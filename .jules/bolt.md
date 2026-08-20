## 2026-06-30 - BM25Store Index Caching and Tokenization

**Learning:** Re-tokenizing text repeatedly inside search loops causes severe $O(Q \cdot N^2 \cdot L)$ bottlenecks in local context retrieval stores. Pre-tokenizing documents lazily upon addition and caching term frequency maps in a `CachedDoc` index reduces search retrieval complexity to $O(Q \cdot N)$, enabling sub-15ms throughput for hundreds of queries over document collections.
**Action:** Always pre-tokenize documents and compute document term frequencies once during indexing rather than re-tokenizing on every search query or scoring operation.
