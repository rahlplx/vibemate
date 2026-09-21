## 2025-05-18 - Pre-compiling tool policy pipeline rules & single-pass partitioning

**Learning:** In multi-layered policy evaluation pipelines like `applyToolPolicyPipeline`, re-compiling string/glob pattern matching RegExps for every candidate tool across every layer creates $O(\text{Steps} \times \text{Tools})$ overhead and garbage collection pressure. Additionally, using array `filter` with `.includes()` for calculating layer deltas introduces $O(N^2)$ linear scans.

**Action:** Pre-compile policy rule patterns (`compilePattern`) once per pipeline layer, partition tools into `nextFiltered` and `deniedTools` in a single indexed loop, and use a `Set` for $O(1)$ lookup during final set subtraction.
