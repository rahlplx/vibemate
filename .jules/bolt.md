## 2025-08-19 - Lazily Cache Split Lines and Reuse RegExp in Secret Scanner

**Learning:** Re-instantiating `RegExp` objects inside tight inner loops over text lines and calling `text.split("\n")` inside pattern iterations creates a severe $O(P \cdot L)$ allocation bottleneck and massive GC pressure during multi-pattern secret scanning.
**Action:** When scanning multi-pattern text line-by-line, lazily cache `text.split("\n")` once per scan call, and instantiate/compile each pattern's `RegExp` once outside the line loop (resetting `lastIndex = 0` per line for global patterns).
