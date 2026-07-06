## 2025-05-14 - [PerformanceMonitor] O(N) Array Filtering in Hot Path
**Learning:** Using `Array.filter()` to prune old data in a high-frequency recording path (like metrics or telemetry) creates an O(M * N) bottleneck where N is the number of items and M is the number of recordings. Since these items are typically added in chronological order, head-pruning with a `while` loop and `shift()` provides an $O(1)$ amortized solution.
**Action:** Always check if data is naturally ordered before using `filter()` or `sort()` in telemetry or monitoring components.
