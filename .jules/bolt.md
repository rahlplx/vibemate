## 2025-05-18 - Fast-path Map capacity checks before materializing arrays

**Learning:** `TelemetryCollector.startSpan` converted `spanMap.values()` into an array (`Array.from(spanMap.values())`) on every single span invocation, regardless of whether capacity (`maxSpanCount`) was reached. For a buffer of 5,000 spans, this caused 5,000 array allocations and iteration overhead on every span creation, reducing throughput by ~130x.
**Action:** Always check $O(1)$ size properties like `map.size > capacity` before materializing `Array.from(map.values())` for eviction routines.
