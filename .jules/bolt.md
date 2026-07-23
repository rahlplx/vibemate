# Bolt Performance Journal

This is Bolt's performance journal for critical learnings and insights.

## 2026-07-23 - Correct LRU Eviction and Single-Pass Conversion on LRUCache
**Learning:** Chaining `.filter()` and `.map()` on `Array.from(map.entries())` creates massive intermediary arrays and high garbage-collection overhead. Standardizing on native `Map` iteration using single-pass `for...of` loops avoids intermediate allocations entirely. Additionally, Map-based LRU caches must actively delete and re-set keys on read/access (`get` and `has`) to ensure correct insertion-order-based LRU eviction behavior.
**Action:** Always prefer single-pass iterative collection conversions using loops (`for...of`) rather than high-overhead array chaining pipelines on high-frequency paths. Ensure any Map-based LRU implementation explicitly updates key order on access.
