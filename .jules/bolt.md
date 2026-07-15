## 2026-07-15 - Batch Eviction in TelemetryCollector
**Learning:** O(N log N) sorting on every insertion is a major bottleneck as the collection grows. Amortizing this cost via batch eviction (e.g., triggering at 1.1x capacity and pruning back to 1.0x) provides a massive performance boost (~800x in micro-benchmarks).
**Action:** Always prefer batch pruning for large in-memory collections that require sorting or expensive filtering for eviction.

## 2026-07-15 - Head-Pruning for Time-Series Data
**Learning:** Using Array.prototype.filter() to prune old data from a chronologically sorted array is O(N). Since we only ever need to remove items from the start of the array, head-pruning via splice() is O(N) but with a much smaller constant factor and avoids creating a new array.
**Action:** Use while-loop with splice(0, count) for pruning chronologically sorted arrays.
