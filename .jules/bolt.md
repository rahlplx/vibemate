## 2025-08-17 - Avoid O(N^2 * L) Document Tokenization in BM25 Search

**Learning:** `BM25Store.retrieve()` was re-tokenizing all documents in the store repeatedly for every document and every query term, causing an extreme $O(Q \cdot N^2 \cdot L)$ bottleneck during local retrieval. Pre-tokenizing documents upon insertion and caching term frequency maps and token counts reduces query execution complexity to $O(Q \cdot N)$.
**Action:** When working with document search or text analysis data structures, pre-tokenize text content upon document addition or lazily cache tokens and term frequency maps rather than re-tokenizing raw string content inside document scoring loops.
