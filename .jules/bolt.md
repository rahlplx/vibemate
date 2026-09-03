## 2025-05-18 - Single-Pass Bounded Scanning for Token Budget Fitting

**Learning:** Slicing strings inside binary search loops over context files (e.g., `content.slice(0, mid)`) creates massive GC pressure and $O(N \log N)$ string allocations. Additionally, `for (const char of text)` allocates string objects for every character in JS runtimes. Since ASCII characters represent at least 1/4 token, the maximum character length for a given token budget $B$ is bounded by $4 \times B$, allowing a single-pass linear scan $O(\min(N, 4B))$ to find the truncation point with zero intermediate string allocations and 46x-400x+ speedups.

**Action:** When truncating large strings or documents to a token or character budget, replace multi-slice binary search with a single-pass bounded scan using `charCodeAt` and early-exit thresholds.
