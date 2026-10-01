## 2025-05-20 - Discovery Question Tree Optimization

**Learning:** `answers.map((a) => [a.questionId, a.value])` inside `getNextQuestion` creates temporary 2D array tuples on every call to construct a Map, and `Array.prototype.find()` allocates closure functions on every tree node traversal. Constructing the Map using an indexed loop and replacing `.find()` with an indexed `for` loop eliminates GC pressure and yields a ~3.6x speedup. Furthermore, converting recursive tree traversal in `getAllQuestions` to an iterative stack avoids call-stack frame allocations.

**Action:** Prefer direct Map insertion with indexed loops over `new Map(arr.map(...))` on frequently evaluated paths, and use indexed `for` loops for short array searches in hot tree traversals.
