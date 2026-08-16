## 2026-06-30 - In-Place Bounded Eviction in TelemetryCollector

**Learning:** Evicting bounded collection overflows by converting Map values to an array and calling `sort()` on every insertion creates a severe $O(N \log N)$ bottleneck on high-throughput tracing hot paths. Map insertion order preserves chronological order (LRU), allowing single-span overflows to be evicted in $O(1)$ directly via `spanMap.values().next().value` and in-place trace/content pruning.

**Action:** Whenever implementing bounded Map/Set retention policies or caches, leverage Map insertion order or single-element fast paths instead of full array conversions and sorting.
