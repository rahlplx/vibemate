## 2025-05-15 - [O(1) LRU Span Eviction]
**Learning:** High-frequency telemetry paths are extremely sensitive to array conversions and sorting. JavaScript Maps maintain insertion order, which allows for O(1) LRU eviction by taking the oldest keys from the iterator.
**Action:** Always prefer Map insertion order for LRU buffers instead of sorting by timestamp. Use batching (e.g., evicting 10% of capacity at a time) to amortize the cost of trace pruning and other metadata maintenance.
