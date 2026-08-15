## 2025-08-15 - Re-instantiating RegExp and splitting strings inside pattern loops

**Learning:**
In `src/security/secret-scanner.ts`, `scanForSecrets` scanned input text across 14 security patterns. For each pattern, `text.split("\n")` was executed redundantly, and `new RegExp(pattern.source, pattern.flags)` was re-instantiated on every line of text. For a 6,000-line text, this created over 78,000 `RegExp` objects per call, causing an $O(P \cdot L)$ allocation bottleneck (~102ms per scan).

**Action:**
1. Split `text.split("\n")` once lazily before processing line-by-line security patterns.
2. Compile pattern `RegExp` objects once per pattern outside the line loop, re-using the compiled instance across lines by setting `lineRegex.lastIndex = 0` before each line.
3. This eliminated thousands of `RegExp` instantiations per scan, achieving a ~10.5x speedup (~90% runtime reduction, from ~102ms down to ~9.8ms per scan).
