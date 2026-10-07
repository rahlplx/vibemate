## 2025-05-18 - Single-Pass SDD Governance Rule Evaluation

**Learning:** In rule evaluation routines like `enforceRules` in `src/sdd/governance-engine.ts`, pushing violations into an unclassified array and later calling `Array.prototype.filter()` multi-pass per severity level creates unnecessary allocation and array iteration overhead. Categorizing violations directly into severity buckets (`warnings`, `errors`, `criticals`) during rule checking along with single timestamp generation eliminates redundant passes completely.

**Action:** Look for multi-pass `Array.prototype.filter()` classifications after array construction in decision and rule engines, and replace them with single-pass categorization during element construction.
