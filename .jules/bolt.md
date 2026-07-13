# Bolt's Performance Journal - Critical Learnings

## 2025-05-15 - [Optimization] Efficient head-pruning for time-series metrics

**Learning:** Using `Array.prototype.filter()` to prune old data from chronologically sorted arrays (like metrics or telemetry spans) creates an $O(N^2)$ bottleneck because it recreates the entire array on every insertion. Since time-series data is sorted, head-pruning via `shift()` in a `while` loop provides an $O(1)$ amortized alternative.

**Action:** Prefer `while (arr[0].timestamp < cutoff) { arr.shift(); }` over `arr.filter(m => m.timestamp >= cutoff)` for hot-path metric recording.

---

## 2025-05-15 - [Optimization] Removing intermediate allocations in LRU collection methods

**Learning:** Chaining `Array.from(map.entries()).filter().map()` is highly inefficient for frequently called collection methods like `keys()`, `values()`, and `entries()`. It creates multiple intermediate arrays and closures, increasing GC pressure and execution time.

**Action:** Use a single `for...of` loop with manual `push()` to build the final result array in one pass.
