## 2026-08-30 - Fast JSON Extraction in Output Validator

**Learning:** When scanning unstructured text for embedded JSON payloads from LLM outputs, linear character indexing (`text[i]`) across leading non-JSON prose creates unnecessary overhead and string/character allocation work. Using `text.indexOf('{')` fast-forwards directly to candidate start positions, and using `text.charCodeAt(i)` avoids string indexing overhead during depth tracking.

**Action:** Prefer native `indexOf` to skip non-matching prefixes, and use `charCodeAt` instead of `string[i]` when traversing text for delimiter matching loops.
