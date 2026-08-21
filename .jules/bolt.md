## 2026-08-21 - Memory Search Engine Pre-Tokenization and Token Sets

**Learning:** In text search engines (like `MemorySearchEngine` in `src/learnings/search.ts`), dynamically tokenizing document content and lowercasing tag arrays inside the query scoring loop (`calculateScore`) causes an $O(Q \cdot N)$ re-processing bottleneck where string splitting and array allocations occur on every query evaluation across every document. Furthermore, using array scanning for exact token matching introduces overhead compared to $O(1)$ `Set` lookups.

**Action:** Lazily pre-tokenize document content, lowercase tag arrays, and store `Set` data structures inside an `IndexedMemory` container during indexing. Pre-tokenize the search query once per search call and perform $O(1)$ set checks for exact token matches before falling back to substring scanning.
