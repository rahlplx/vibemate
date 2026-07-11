## 2026-07-11 - [O(N) Array Pruning Anti-pattern]
**Learning:** Pruning time-series data using `Array.prototype.filter()` on every insertion creates an $O(N^2)$ bottleneck in hot paths. Since the data is already chronologically sorted, head-pruning with a `while` loop and `shift()` provides an $O(1)$ amortized alternative.
**Action:** Use head-pruning (`while` + `shift()`) instead of `filter()` when managing retention for chronologically ordered data structures.
