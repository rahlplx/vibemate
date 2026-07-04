# Bolt's Journal - Critical Learnings Only
## 2025-05-22 - Optimized PerformanceMonitor head-pruning
**Learning:** O(N) array filtering in high-frequency paths like metric recording is a major bottleneck as N grows. Replacing it with head-pruning via `shift()` provides O(1) amortized eviction for chronologically ordered data.
**Action:** Always prefer head-pruning or specialized data structures (like LRU maps) for timestamped logs or metrics.
