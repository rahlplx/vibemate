# Bolt's Performance Journal

## 2025-03-04 - Telemetry Eviction Optimization
**Learning:** Avoid using `Array.from(map.values()).sort()` on high-frequency paths like telemetry span creation. Doing so results in $O(N \log N)$ complexity and heavy GC pressure due to array allocation and sorting on every single span insertion. Leveraging the insertion-order property of JavaScript Maps provides true $O(1)$ LRU eviction and highly efficient $O(N)$ priority eviction.
**Action:** Use native Map properties and iterators (e.g., `map.keys().next().value`) to retrieve keys in insertion order. Perform single-pass scans over values for custom eviction criteria rather than sorting the entire collection. Ensure synchronizing all tracking sets (such as `contentSpanIds`) during eviction to prevent silent memory leaks.
