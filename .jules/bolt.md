# Bolt's Journal - Critical Learnings

## 2025-02-28 - ISO 8601 String Comparison vs Date.parse() in Array Sorting
**Learning:** Calling `Date.parse()` inside array `.sort()` comparators executes O(N log N) date string parsings per sort call (e.g., 20,000 string parses per 1k array sort), creating massive CPU overhead. Standard ISO 8601 strings in UTC ("YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss.sssZ") sort lexicographically in exact chronological order.
**Action:** Use string comparisons (`b > a ? 1 : b < a ? -1 : 0`) when sorting ISO 8601 timestamps, or single-pass min/max scanning for date bounds, to achieve ~10x speedups without date parsing overhead.
