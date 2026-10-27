## 2026-03-30 - Pre-processing Static Rules in SDD Knowledge Base

**Learning:** Repeatedly filtering static rules using `context.toLowerCase()`, `r.category`, and `r.evidence.map(e => e.toLowerCase().substring(0, 20))` inside per-query functions creates significant overhead from string transformations, closures, and substring allocations. Pre-indexing static structures (e.g. pre-lowercasing categories and evidence snippets, pre-grouping severity levels and enforcement policies) reduces query execution time from ~810ms down to ~2.5ms per 1,000,000 queries (~324x speedup).

**Action:** Whenever a knowledge base or rule engine operates over static collections, pre-process and index metadata at module initialisation to turn O(N) inline allocations into O(1) lookups or zero-allocation scans.
