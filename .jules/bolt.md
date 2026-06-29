## 2025-05-15 - Optimized Telemetry Span Eviction
**Learning:** `Array.from(map.values())` and sorting on hot paths (like telemetry span creation) is a major performance bottleneck, especially when the Map size is large (e.g., 10,000+). In this codebase, the `TelemetryCollector` was taking ~4.8ms per span when at capacity because it re-sorted all spans on every insertion.
**Action:** Use direct Map manipulation for LRU eviction ($O(1)$) and single-pass iteration for Priority eviction ($O(N)$). Amortize costs with batch eviction (e.g., evicting 10% when reaching 110% capacity).
