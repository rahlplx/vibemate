# Bolt's Journal - Critical Learnings

## 2025-05-20 - Fast-path string substitution in scaffold rendering
**Learning:** In template rendering functions, re-compiling `RegExp` per file and per variable creates heavy allocations and regex parsing overhead. Replacing dynamic `new RegExp` creation with `String.prototype.replaceAll` literal matching and fast-path `.includes('{{')` checks yields a ~7x speedup.
**Action:** Use literal `replaceAll` and `.includes()` guard checks when replacing template tags across multiple files.
