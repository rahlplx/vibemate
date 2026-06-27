# Jules SDK — Learnings Report (Loop 2 — Enhanced)

**Repo:** https://github.com/google-labs-code/jules-sdk
**Analysis date:** 2026-06-27
**Engine version:** Enhanced (8 gaps fixed)

## Enhanced Detection Results

### Gap 1: Monorepo — FIXED ✅
- **Detected:** Turborepo monorepo with 24 packages
- **Packages:** core, fleet, mcp, merge + examples
- **Before:** Module count = 0 (flat file tree)

### Gap 2: Error Hierarchy — FIXED ✅
- **Detected:** Typed error handling (10 error classes)
- **Hierarchy:** JulesError → JulesNetworkError, JulesApiError → JulesAuthenticationError, JulesRateLimitError
- **Before:** Misclassified as "mixed"

### Gap 3: Test Organization — FIXED ✅
- **Detected:** 154 test files organized by domain
- **Categories:** unit, integration, mocks
- **Framework:** Vitest
- **Before:** Only test-to-source ratio

### Gap 4: Build Pipeline — FIXED ✅
- **Detected:** Prettier (inline config), TypeScript strict, CI/CD
- **Conventions:** 9 detected (was 6)
- **Before:** Missed inline prettier config

### Gap 5: API Surface — FIXED ✅
- **Detected:** 1070 exports, 39% JSDoc coverage
- **Types:** 360 exported types, 166 exported functions
- **Before:** Only export count

### Gap 6: Streaming/Async — FIXED ✅
- **Detected:** async-iterator, generator, event-emitter, observable, node-streams
- **Before:** Only basic Observer pattern

### Gap 7: Security — FIXED ✅
- **Detected:** API key handling, 41 env vars, 70 auth patterns
- **Before:** No security analysis

### Gap 8: Test Separation — FIXED ✅
- **Complexity:** 62 (was 105, test files excluded)
- **Anti-patterns:** 62 (was 105)
- **Before:** Test files inflated complexity

## Score Comparison

| Metric | Loop 1 | Loop 2 | Delta |
|--------|--------|--------|-------|
| Error handling | mixed | typed | CORRECTED |
| Complexity | 105 | 62 | -41% (accurate) |
| Conventions | 6 | 9 | +3 |
| Weaknesses | 1 (wrong) | 0 | FIXED |
| Strengths | 4 | 5 | +1 (typed errors) |

## Remaining Findings (All Legitimate)

1. **[MEDIUM]** Complexity score 62 — some source files are large
2. **[LOW]** Unused dependency: @types/bun
3. **[MEDIUM]** 62 anti-patterns in source code
4. **[LOW]** No ESLint (Prettier only)

## RL Signal: Aggregate improved from 0.01 to 0.20

---

## Governance & Guardrails

### What We Validated

| Capability | Status | Evidence |
|------------|--------|----------|
| Monorepo detection | ✅ Works | Turborepo detected, 24 packages counted |
| Error hierarchy | ✅ Works | 10 typed error classes found |
| Test organization | ✅ Works | Unit/integration/mocks categories detected |
| API surface analysis | ✅ Works | 1070 exports, JSDoc coverage measured |
| Async pattern detection | ✅ Works | 5 async pattern types detected |
| Security analysis | ✅ Works | API keys, env vars, auth patterns found |
| Test/source separation | ✅ Works | Complexity reduced 41% |
| Convention detection | ✅ Works | Inline configs detected |

### What Needs Guardrails

1. **False positive: "No linter"** — Prettier IS configured (inline in package.json). Our detection checks `.prettierrc` file but not inline config. FIXED in enhanced version.

2. **Anti-pattern threshold** — 62 anti-patterns may still be too many for a well-maintained Google SDK. Consider adjusting thresholds per project maturity.

3. **JSDoc coverage** — 39% may be acceptable for SDK but should be flagged as improvement opportunity.

### Promotion Criteria

| Enhancement | Promote? | Reason |
|-------------|----------|--------|
| Monorepo detection | ✅ PROMOTE | Critical for accurate analysis |
| Error hierarchy | ✅ PROMOTE | Prevents false weakness flags |
| Test organization | ✅ PROMOTE | Enables testing strategy assessment |
| API surface | ✅ PROMOTE | Essential for SDK analysis |
| Async patterns | ✅ PROMOTE | Recognizes modern TS patterns |
| Security analysis | ✅ PROMOTE | Catches security patterns |
| Test/source separation | ✅ PROMOTE | Prevents metric inflation |
| Inline config detection | ✅ PROMOTE | Prevents false "no linter" flags |

### Rules for Future Enhancements

1. **Before adding a new pattern detector:** Write a failing test with a real-world example
2. **Before changing thresholds:** Validate against 3+ repos of different sizes
3. **Before promoting:** Run full pipeline on Jules SDK and verify zero false positives
4. **Evidence-driven:** Every enhancement must include test evidence
5. **Governance:** All changes require TDD cycle (RED → GREEN → REFACTOR)
