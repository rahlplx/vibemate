## 2025-02-23 - Fast-path check for DLP mask replacement in ContextPipeline

**Learning:** In cloud context response re-injection (`ContextPipeline.reinject`), regular expressions were run against original code text for every mask rule regardless of whether the response contained masked tokens. Adding a fast `result.includes(mask.replacement)` check before executing original text pattern matching skips expensive regex evaluation and array allocations when no masked strings exist in the response (~8x speedup).

**Action:** Always check if target substitution tokens exist in response strings using fast native `includes()` substring lookups before executing regular expressions or match operations against source documents.
