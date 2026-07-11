## 2026-07-11 - [O(N) Array Pruning Anti-pattern]
**Learning:** Pruning time-series data using `Array.prototype.filter()` on every insertion creates an $O(N^2)$ bottleneck in hot paths. Since the data is already chronologically sorted, head-pruning with a `while` loop and `shift()` provides an $O(1)$ amortized alternative.
**Action:** Use head-pruning (`while` + `shift()`) instead of `filter()` when managing retention for chronologically ordered data structures.
## 2026-07-11 - [LRU Eviction with Map Insertion Order]
**Learning:** Re-sorting arrays or maps on every eviction is $O(N \log N)$. Since JavaScript Maps preserve insertion order, the first entries are always the oldest. Leveraging this for LRU eviction provides an $O(1)$ alternative. Additionally, batching evictions (e.g., at 110% of max size) avoids expensive array copies and deletions on every operation.
**Action:** Use Map iteration order for LRU eviction and batch cleanup to maintain high throughput in telemetry and caching modules.
