## 2025-05-18 - Pre-tokenized indexing and token Set fast path in MemorySearchEngine

**Learning:** Computing string splitting, lowercasing, and length boost calculations on every `search()` invocation across all indexed documents introduces substantial CPU and memory overhead ($O(N \cdot M)$ string tokenization and allocations per search). Pre-tokenizing content/tags and building `Set<string>` lookups during `index()` allows `search()` to perform fast $O(1)$ token checks before falling back to substring matching.

**Action:** Whenever building in-memory search or matching engines, move text lowercasing, tokenization, and `Set` construction into the indexing phase (`index()`) and tokenize queries once per query invocation in `search()`.
