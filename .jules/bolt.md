## 2025-05-18 - Hoisting RegExp and Zero-Allocation Word Counting in SDD Intent Extractor

**Learning:** Re-declaring RegExp literals and array objects inside function bodies creates significant GC pressure and object allocation overhead on hot paths. Additionally, calling `.toLowerCase()` multiple times on the same input string across sub-routines and splitting strings with `split(/\s+/)` for word counts wastes execution time.

**Action:** Hoist stateless RegExp objects and array constants to module scope. Precompute string transformations (like `.toLowerCase()`) once at entry functions and pass them down. Use zero-allocation `charCodeAt` character scanning for counting words instead of allocating string arrays.
