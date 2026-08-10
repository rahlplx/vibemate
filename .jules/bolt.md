# Bolt's Journal - Critical Learnings Only

## 2026-03-01 - BM25Store O(N^2) Repeated Tokenization Bottleneck
**Learning:** Re-tokenizing an entire corpus in nested loops inside search scoring is a severe anti-pattern that leads to quadratic time complexity $O(Q \cdot N^2 \cdot L)$ and heavy garbage collection overhead. Pre-tokenizing during indexing/caching reduces retrieval to $O(Q \cdot N)$ with zero memory allocations during search.
**Action:** Always pre-calculate and cache structural document metadata (like tokens, lengths, and term frequency maps) during indexing/lazy caching rather than recalculating them inside per-document comparison and scoring routines.
