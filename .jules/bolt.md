# Bolt's Journal - Critical Learnings Only

## 2025-02-23 - True LRU Behavior and Map Iteration Optimization in JS/TS
**Learning:** In JavaScript/TypeScript, standard `Map` structures maintain insertion order. Implementing an LRU cache with a Map requires deleting and re-inserting elements during read operations (`get` and `has`) to keep them in the correct position. Additionally, converting Map collections to arrays, filtering, and mapping creates severe garbage collection overhead due to multiple temporary intermediate arrays (e.g. `Array.from(cache.entries()).filter().map()`). Replacing these allocations with a single-pass `for...of` loop over Map entries or values reduces execution time of collection methods by over 80%.
**Action:** Always prefer direct single-pass generator/Map iteration using `for...of` loops rather than chained functional collection operations (`Array.from`, `filter`, `map`, `reduce`) on high-frequency paths or frequently called cache serialization methods.
