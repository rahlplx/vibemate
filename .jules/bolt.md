## 2025-02-23 - Optimize RuleEngine Summary and History Sorting

**Learning:** Calculating state summaries in aggregate objects (like `RuleEngine`) by sorting full history arrays and multi-pass filtering on array slices creates an unnecessary $O(N \log N)$ overhead and garbage collector pressure due to repeated `Date` parsing. Separating state maps (`proposals`, `rules`, `rejectedProposals`) enables $O(1)$ property reads for `.size`, and comparing ISO 8601 date strings directly in `.sort()` avoids allocations.

**Action:** Whenever tracking state transitions across categories in stateful engines or trackers, store items in dedicated Map/Set collections by status so counts can be queried in $O(1)$ via `.size` without needing array sorting or filtering.
