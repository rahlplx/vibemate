## 2025-05-19 - Avoid full text splits on comparison target strings in QualityGuard

**Learning:** When validating text summaries against large original documents, splitting the entire `original` text string using `.split(/\s+/)` creates large arrays and Sets. Gathering target terms from the small summary into a Set and scanning `original` line/word tokens via regex execution with early exit avoids full array allocations and achieves a ~10x speedup.
**Action:** When evaluating presence of small term sets within large text blocks, scan the large text stream/regex instead of building full token arrays/Sets of the large text.
