## 2025-05-14 - [PerformanceMonitor O(N) Pruning Anti-pattern]
**Learning:** Using `Array.prototype.filter()` to prune expired entries from a chronologically ordered array on every insertion creates an $O(N)$ bottleneck, leading to $O(N^2)$ overall complexity for metric recording. Since metrics are naturally sorted by timestamp, we can use a `while` loop with `shift()` to remove only expired entries from the head in $O(1)$ amortized time.
**Action:** Avoid `filter()` for pruning time-series data; prefer head-pruning with `shift()` or similar when data is sorted by time.
