## 2025-05-14 - Indexed charCodeAt Scanner vs RegExp.exec in JSC Runtime
**Learning:** In JavaScriptCore (Bun), using `RegExp.exec()` loops for line-by-line or word-by-word string tokenization creates RegExp result object allocations and updates instance properties, making it slower than string `.match(/\S+/g)` and significantly slower than an indexed `charCodeAt` scanner loop.
**Action:** When extracting whitespace-delimited words or tokens from high-frequency string inputs, use indexed `charCodeAt` character scanning rather than `RegExp.exec()` or `String.prototype.split(/\s+/)`.
