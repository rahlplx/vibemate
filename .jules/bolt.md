## 2026-09-02 - Single-pass Map iteration for RequirementsTracker

**Learning:** Converting `Map.values()` to an array using spread syntax (`[...map.values()]`) and chaining `.map()`, `.filter()`, or `.reduce()` calls allocates multiple intermediate arrays and iterates through datasets multiple times. For data structures like `RequirementsTracker` where `list()` and `getStats()` are called frequently, replacing multi-pass array operations with single-pass `for...of` loops over `this.reqs.values()` eliminates garbage collection overhead and provides up to ~3x speedup.

**Action:** Whenever calculating metrics or filtering items from Map or Set data structures, iterate directly via `for...of` in a single pass rather than spreading into intermediate arrays and chaining array methods.
