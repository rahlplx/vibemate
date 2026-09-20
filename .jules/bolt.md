## 2025-05-18 - Fast-Path Check for Unmasking in DLP Context Pipeline

**Learning:** Running regex matches (`original.match(pattern)`) across large source files in context re-injection pipelines is expensive when most DLP pattern replacements are not present in the model's response text. Adding a lightweight `response.includes(mask.replacement)` string check skips unneeded regex pattern scans and match array allocations entirely.
**Action:** Always check if a target replacement string/token exists in the output text using `String.prototype.includes` before executing regular expression matches against input source text.
