## 2025-05-20 - Fast-path direct stat checks vs sequential glob queries in StackDetector

**Learning:** Running `glob` queries in sequential loops for plain relative filenames (like `tsconfig.json`, `next.config.js`, `bun.lock`) adds massive async overhead (~5.8ms per call) due to glob pattern parsing, string matching, and directory scans. Fast-pathing plain filenames with `fs.promises.stat` and executing checks concurrently with `Promise.all` reduced `StackDetector.detect()` runtime from ~5.8ms to ~0.9ms (~6.4x speedup).

**Action:** When scanning known paths or fixed relative file lists, check for glob wildcard characters (`[*?{}]`) first. Use direct `stat` or `access` calls in parallel (`Promise.all`) for fixed paths, and fallback to `glob` only when actual wildcard patterns are present.
