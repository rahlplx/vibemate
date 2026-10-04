## 2025-05-18 - ConnectionPool Waiter Scanning and Resource Teardown

**Learning:** Using `Array.prototype.findIndex()` inside `setTimeout` callbacks in queue systems (like connection pools) creates unnecessary closure function allocations per timeout invocation and scans arrays via multi-pass callback evaluation. Replacing `findIndex` with an indexed `for` loop avoids closure creation and improves linear scan speed. Additionally, replacing `for...of` iterations over internal state structures during pool destruction with direct array index loops and explicit array draining (`available = []`, `active.clear()`, `waiting = []`) prevents intermediate Iterator object allocations.

**Action:** In high-concurrency wait queues and pool resource handlers, prefer zero-allocation indexed `for` loops for search/removal and direct collection resets over `findIndex` and `for...of` iterations.
