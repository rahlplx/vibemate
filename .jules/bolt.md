## 2025-05-15 - [Efficient Chronological Pruning]
**Learning:** Using `Array.prototype.filter` on a hot path to prune old metrics results in $O(N)$ allocation and iteration per call. Since metrics are added chronologically, they can be pruned in-place from the head of the array using `shift()` in a `while` loop, reducing the common case (no expiration) to $O(1)$ and minimizing Garbage Collection pressure.
**Action:** Always check if a collection is chronologically sorted before using `filter` for TTL-based cleanup. Use head-pruning for $O(1)$ amortized maintenance.

## 2025-05-15 - [Telemetry Bottleneck: O(N log N) Sorting]
**Learning:** `TelemetryCollector` was performing a full `Array.from().sort()` on every `startSpan` to enforce retention limits. At 10k spans, this adds ~0.15ms of latency to a operation that should be near-instant.
**Action:** In future optimizations, replace the full sort with a Map-based LRU or a batch eviction strategy that only runs when a threshold (e.g., 1.1 * limit) is reached.
