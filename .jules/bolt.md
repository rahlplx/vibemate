# Bolt's Performance Journal

## 2025-07-26 - True LRU Behavior and Collection Multi-Pass Overhead in LRUCache
**Learning:**
1. Map-based LRU caches must delete and re-insert keys on read/access (`get`/`has`) to refresh their insertion order. Without this, the cache behaves as a First-In, First-Out (FIFO) queue rather than a true Least-Recently-Used (LRU) cache, evicting active keys prematurely.
2. Building results from a Map by chained allocations like `Array.from(map.entries()).filter(...).map(...)` incurs massive garbage collection pressure and CPU overhead from multi-pass allocations. Consolidating these into a single-pass `for...of` loop with manual array construction yields 2x to 4x speedup.

**Action:**
1. Always refresh Map entry positions on access (`get`/`has`) when implementing LRU/MRU algorithms utilizing Javascript's ordered `Map`.
2. Avoid multi-pass array operations (chained `filter`, `map`, etc.) on collections in performance-sensitive modules; replace with single-pass manual collection builders.
