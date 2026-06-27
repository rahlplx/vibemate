# Jules SDK — Learnings Report (Loop 1)

**Repo:** https://github.com/google-labs-code/jules-sdk
**Analysis date:** 2026-06-27

## What Our Tools Found

### Architecture
- Entry points: none detected (monorepo structure not recognized)
- Layer violations: 0
- Circular deps: 0
- Adapter patterns: 6 detected

### Quality
- Test ratio: 74.0% (excellent)
- Error handling: mixed (WRONG — actually well-typed hierarchy)
- Complexity score: 105 (inflated by test files)
- Type coverage: 90%

### Patterns
- Design patterns: 307 (Observer, Factory, Builder, Strategy)
- Anti-patterns: 105 (many from test files — false positives)
- Conventions: typescript-strict, ci-cd, contributing-guide, licensed, gitignore, env-example

## Audit Findings

### [MEDIUM] High complexity score
105 anti-patterns detected, but many are false positives from test files.

### [LOW] Unused dependencies
@types/bun is unused — legitimate finding.

### [MEDIUM] Multiple anti-patterns detected
God Files and Deep Nesting found, but test files inflate the count.

### [LOW] No linter configured
WRONG — Prettier is configured. ESLint is absent but Prettier handles formatting.

## Value Assessment
- **Score:** 70/100
- **Strengths:** Clean architecture, Good test coverage, Good tooling setup, 307 design patterns
- **Weaknesses:** Generic error handling (WRONG — actually well-typed)
- **ROI:** 18.5h

---

## CRITICAL: What Our Tools MISSED (8 Gaps)

### Gap 1: Monorepo Structure Not Detected
- **Reality:** 4 packages (core, fleet, mcp, merge) with Turborepo workspace
- **Our tools saw:** Flat file tree, no workspace awareness
- **Impact:** Module count = 0, avg module size = 0 — completely wrong
- **Root cause:** `extractData()` walks files but doesn't parse `package.json` workspaces or detect monorepo patterns

### Gap 2: Error Hierarchy Misclassified
- **Reality:** 10 typed error classes extending JulesError base (JulesNetworkError, JulesApiError, JulesRateLimitError, MissingApiKeyError, etc.)
- **Our tools saw:** "mixed" error handling
- **Impact:** Wrong weakness flagged — this is actually exemplary typed error handling
- **Root cause:** Our regex only checks `catch(e: SomeError)` patterns, doesn't detect class-based error hierarchies

### Gap 3: Test Organization Not Analyzed
- **Reality:** 23+ test files organized by domain (unit, integration, cache, sync, network, platform, query, snapshot, storage)
- **Our tools saw:** Only test-to-source ratio number
- **Impact:** Missing testing strategy quality assessment
- **Root cause:** No analysis of test directory structure, test categories, or testing patterns

### Gap 4: Build Pipeline Not Assessed
- **Reality:** Turborepo orchestration + Vite bundler + Vitest test runner + Prettier formatter
- **Our tools saw:** "No linter configured" (missing ESLint detection, but Prettier IS configured)
- **Impact:** Wrong tooling assessment
- **Root cause:** `detectConventions()` checks `.prettierrc` but Jules SDK uses inline `prettier` config in `package.json`

### Gap 5: SDK API Surface Not Analyzed
- **Reality:** 50+ exported types, well-documented public API with JSDoc
- **Our tools saw:** Only export count number
- **Impact:** Missing API quality, documentation coverage, public surface analysis
- **Root cause:** No API surface analysis — just counting exports

### Gap 6: Streaming/Async Patterns Not Recognized
- **Reality:** AsyncIterator for session streaming, reactive streams, poll-based updates
- **Our tools saw:** Only basic Observer pattern detection
- **Impact:** Missing architectural sophistication assessment
- **Root cause:** Pattern detection is regex-based, doesn't understand AsyncIterator/for-await-of patterns

### Gap 7: Security Patterns Not Checked
- **Reality:** API key handling via env vars, deprecated test-only keys documented, publishConfig with auth
- **Our tools saw:** No security analysis beyond vulnerable deps
- **Impact:** Missing security assessment for SDK
- **Root cause:** No security pattern detection module

### Gap 8: Test Files Counted as Source Code
- **Reality:** Test files should be excluded from complexity/anti-pattern analysis
- **Our tools saw:** 105 anti-patterns (many from test files like session.test.ts at 18KB)
- **Impact:** Wrong complexity assessment — real source code is much cleaner
- **Root cause:** `walkCode()` doesn't distinguish test files from source files

---

## Meta-Analysis: Why Our Tools Failed

| Gap | Tool/Module | Root Cause | Enhancement Needed |
|-----|-------------|------------|-------------------|
| Monorepo | extract.ts | No workspace detection | Parse package.json workspaces, detect turborepo/nx/lerna |
| Error hierarchy | analyze.ts | Regex-only error detection | AST-based error class hierarchy analysis |
| Test organization | extract.ts | Only ratio, no structure | Analyze test directory tree, categorize test types |
| Build pipeline | extract.ts | Missed inline prettier config | Check package.json for prettier/eslint config |
| API surface | extract.ts | No API analysis | Analyze exports, JSDoc coverage, public types |
| Streaming patterns | patterns.ts | Regex-based detection | Recognize AsyncIterator, for-await-of, generators |
| Security | (missing) | No security module | API key patterns, secrets detection, auth analysis |
| Test inflation | extract.ts | Tests counted as source | Separate test files from source in metrics |

## RL Feedback: What to Fix

1. **Negative reward (-2):** Complexity detection is wrong — tests inflate score
2. **Negative reward (-0.3):** Unused deps detection works but is minor
3. **Positive reward (+1):** Pattern detection found real patterns
4. **Positive reward (+1):** Convention detection works well
5. **Aggregate:** Near zero — too many false positives dilute real signal
