## 2026-06-28 - [Optimized Telemetry Eviction]
**Learning:** Batching eviction triggered at a threshold (1.1x maxSpanCount) significantly reduces overhead from (N \log N)$ sorting and trace pruning. However, strict E2E tests often expect exactly `maxSpanCount` spans, requiring a 'force' flag for single-span overflows to maintain compatibility while still batching for high-throughput bursts.
**Action:** Use batch thresholds for memory-bounded collections, but ensure the eviction policy can handle 'one-at-a-time' requests if existing tests depend on exact counts.
