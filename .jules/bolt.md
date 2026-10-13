## 2025-05-18 - Optimize Folder Analysis and Pattern Matching

**Learning:** During folder analysis (`analyzeFolder`), reading the root directory multiple times (once for tree building, once for top-level entry checks, and once for pattern scanning) introduces unnecessary I/O overhead. Additionally, passing inline array literals like `['controllers', 'models', 'views'].includes(e)` inside `.some()` predicates creates thousands of temporary array allocations per directory scan.

**Action:** Accumulate top-level entry names in an array during `buildTree` execution to avoid redundant readdirs. Convert top-level entry arrays to a `Set` once for $O(1)$ lookups in pattern detection and config matching. Use `lastIndexOf('.')` and `.slice()` instead of `split('.').pop()` to avoid string array allocations per file.
