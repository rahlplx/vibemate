# Bolt Performance Journal

## 2025-05-14 - Optimized PerformanceMonitor Pruning
**Learning:** Pruning time-series data using `Array.prototype.filter()` on chronologically sorted arrays is an anti-pattern that creates $O(N^2)$ bottlenecks. For a retention period, $O(1)$ amortized head-pruning via `while` loops and `shift()` is significantly faster.
**Action:** Use head-pruning for time-windowed metrics and traces instead of full array filtering.
