## 2025-05-18 - Memory Search Engine Pre-Tokenization

**Learning:** Tokenizing document content and mapping tags inside per-query scoring functions creates $O(Q \cdot N)$ redundant string allocations and splits when querying $N$ indexed memories across $Q$ searches.

**Action:** Pre-tokenize document content, lowercase tags, pre-calculate content length boost, and pre-combine tokens during document indexing (`index()`). In search calls, tokenize query strings once at the entry point of `search()` instead of inside per-document scoring functions.
