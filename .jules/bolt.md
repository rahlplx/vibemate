## 2025-05-20 - Concurrent File I/O & Integer Timestamp Cutoffs for Audit Exporter

**Learning:** In telemetry and audit exporters (`AuditExporter.loadEntries`), reading multiple telemetry files sequentially in a `for...of` loop creates an I/O waterfall bottleneck (~25.5ms for 50 files). Replacing sequential reads with concurrent `Promise.all` file reads and applying early integer timestamp filtering (`span.startTime < sinceMs`) before `Date` object construction and ISO string formatting yields a ~2.3x speedup (~11ms vs ~25.5ms).

**Action:** Whenever parsing date-range restricted records from disk, use `Promise.all` for parallel reads and compare raw numeric timestamps (`ms`) before constructing `Date` instances or converting to ISO strings.
