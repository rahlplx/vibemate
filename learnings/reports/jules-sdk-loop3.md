# Learnings Report — Loop 3 (Enhanced Engine)

**Generated:** 2026-06-27
**Repo:** https://github.com/google-labs-code/jules-sdk
**Engine:** Cognitive-enhanced with single-pass extract + ensemble voting

---

## Extract Summary

- **Files:** 531
- **LOC:** 63,666
- **Monorepo:** Turborepo (24 packages)
- **Test files:** 154 (vitest)
- **API exports:** 1,070
- **Async patterns:** async-iterator, generator, event-emitter, observable, node-streams
- **Conventions:** 9 (typescript-strict, ci-cd, contributing-guide, licensed, gitignore, env-example, security-policy, code-of-conduct, prettier)
- **Security env vars:** 41

## Findings (3)

### [MEDIUM] High complexity score
- 62 anti-patterns detected (7 god files, 55 deep nesting)
- Effort: medium | Impact: medium

### [LOW] Unused dependencies
- 1 unused dependencies detected
- Effort: easy | Impact: low

### [LOW] No linter configured
- No ESLint configuration found
- Effort: trivial | Impact: low

## Value Assessment

- **Score:** 73/100
- **Strengths:** Clean architecture, Good test coverage, Typed error handling, Good tooling setup, 307 design patterns used
- **Weaknesses:** None

## Cognitive Assessment

- **Maturity:** enterprise (90%)
- **Ensemble confirmed:** 3/3 findings confirmed
- **Difficulty items:** 1 (complexity at 100%)

## Loop Comparison

| Metric | Loop 1 | Loop 2 | Loop 3 |
|--------|--------|--------|--------|
| Findings | 14 | 4 | 3 |
| Score | 70 | 70 | 73 |
| Error handling | mixed | typed | typed |
| Test files | 80 | 154 | 154 |
| Extract time | timeout | 3.2s | 3.2s |
| Conventions | 6 | 9 | 9 |
| Strengths | 4 | 5 | 5 |
| Weaknesses | 1 | 0 | 0 |

## Governance

### Promotion Criteria
- All 3 findings are actionable
- No critical/high findings (clean codebase)
- Cognitive assessment confirms enterprise maturity
- Engine correctly identifies typed error handling, monorepo, test infrastructure

### Guardrails
- Every new detector needs a failing test with real-world example
- Threshold changes validated against 3+ repos
- All changes require TDD cycle (RED → GREEN → REFACTOR)
- Ensemble threshold: 0.4 (validated for single-detector scenarios)

### Lessons Learned
1. Single-pass extract fixes timeout (was 6 walks, now 1)
2. Test file exclusion prevents anti-pattern inflation
3. Ensemble voting with 0.4 threshold works for single-detector
4. Dedup findings by merging related rules
5. Cognitive assessment adds maturity-aware thresholds
