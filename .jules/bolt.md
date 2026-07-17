# Bolt's Performance Journal

This file tracks critical learnings and patterns from Bolt's optimizations.

## 2025-03-04 - Chronological Time-Series Binary Search & In-Place Pruning
**Learning:** In chronological time-series modules like `PerformanceMonitor`, filtering data points by timestamp cutoff with `Array.prototype.filter` creates an unnecessary $O(N)$ scanning cost. Since the timestamps are naturally sorted chronologically, a binary search finds the first index matching the duration threshold in $O(\log N)$ time. Pruning the array using `Array.prototype.splice(0, index)` performs head-pruning in-place, which is significantly more efficient than recreating a new array through filtering and reduces garbage collection overhead.
**Action:** Always check if timestamp-ordered arrays can be queried via binary search ($O(\log N)$) and pruned in-place ($O(1)$ amortized/sub-linear operations) instead of filtering or shifting items in a loop.
