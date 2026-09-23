## 2025-05-24 - Parallelize File Writes in HarnessCompiler

**Learning:** Generating skill files sequentially with `for (const skill of skills)` created unnecessary serial I/O bottlenecks when compiling agent artifacts. Using concurrent file generation with `Promise.all(skills.map(...))` allows Node / Bun I/O event loops to perform file system writes in parallel, significantly reducing overall compilation latency without compromising memory overhead or file integrity.

**Action:** Whenever generating multiple independent artifact files or performing disk writes in a loop, leverage `Promise.all()` with `map()` instead of sequential `for...of` loops.
