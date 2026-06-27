# /vibe:plan — Execution Plan for Blockers

**Date:** 2026-06-27 | **PR:** #4 | **Goal:** Fix 3 critical blockers, reach merge-safe state

---

## Root Cause Summary

### Blocker 1: Test Failures (40 tests)

| Question | Answer |
|----------|--------|
| **WHO** | tests/execution/dispatcher.test.ts (7), tests/improve/observation.test.ts (4) |
| **WHAT** | UNIQUE constraint failed: projects.id — NOT lock contention |
| **WHERE** | beforeEach creates project 'p1' but stale DB from interrupted run already has it |
| **WHEN** | Every run after an interrupted suite (infinite failure loop) |
| **WHY** | afterEach cleanup never runs when beforeEach fails (dispatcher undefined → TypeError → rmSync skipped) |
| **HOW** | Clean stale DB at START of beforeEach + null guards in afterEach |

**Fix:** 2 files × 2 small edits = **5 minutes**

### Blocker 2: OAuth Security (6 gaps)

| Question | Answer |
|----------|--------|
| **WHO** | Auth.ts implemented incrementally — state first, PKCE never added |
| **WHAT** | No PKCE, no CSRF on callback, singleton state, plaintext tokens |
| **WHERE** | auth.ts:54-63 (generateAuthUrl), auth.ts:74-104 (exchangeCode) |
| **WHEN** | Oversight — PKCE was never started |
| **WHY** | Public CLI client needs PKCE as ONLY defense against code interception |
| **HOW** | Add PKCE to OAuthConfig, generate code_verifier/challenge, send in exchange |

**Fix:** 4 changes to auth.ts + new tests = **45-60 minutes** (TDD)

### Blocker 3: Type Safety (28 errors)

| Question | Answer |
|----------|--------|
| **WHO** | cli/status.ts (14), mcp/auth.ts (4), state/store.ts (13 casts), context/ (4) |
| **WHAT** | Missing DOM lib, wrong interfaces, `as` casts, unused vars |
| **WHERE** | tsconfig.json missing "DOM", status.ts interface incomplete |
| **WHEN** | tsconfig was set to ES2022 only — bun provides fetch but TS can't see types |
| **WHY** | better-sqlite3 returns unknown (standard pattern), status.ts interface doesn't match runtime |
| **HOW** | Add DOM to tsconfig, fix status.ts interface, add null guards |

**Fix:** tsconfig 1 min + status.ts 5 min + provenance.ts 2 min + unused vars 3 min = **~11 minutes**

---

## Execution Plan

### Phase 1: Fix Test Isolation (5 min)

```
Step 1.1: tests/execution/dispatcher.test.ts
  - Add stale DB cleanup at START of beforeEach
  - Add null guards in afterEach (optional chaining)

Step 1.2: tests/improve/observation.test.ts
  - Same pattern as 1.1

Step 1.3: Verify
  - bun test tests/execution/dispatcher.test.ts
  - bun test tests/improve/observation.test.ts
```

### Phase 2: Fix Type Safety (11 min)

```
Step 2.1: tsconfig.json
  - Add "DOM" to lib array

Step 2.2: src/cli/status.ts
  - Add completed?: string[] and artifacts?: Record<string, string> to state type
  - Add null guard before state.project access

Step 2.3: src/context/provenance.ts
  - Fix Omit generic to include 'type' field

Step 2.4: src/context/engine.ts + repo-map.ts
  - Remove or prefix unused variables

Step 2.5: Verify
  - bun run typecheck
```

### Phase 3: Fix OAuth Security (45-60 min)

```
Step 3.1: TDD — Write failing tests first
  - Test PKCE params in generated URL
  - Test code_verifier sent in exchange
  - Test code_challenge is SHA-256 of verifier
  - Test concurrent state isolation

Step 3.2: Implement PKCE
  - Add usePKCE to OAuthConfig
  - Add generateCodeVerifier/generateCodeChallenge helpers
  - Update generateAuthUrl to include PKCE params
  - Update exchangeCode to send code_verifier
  - Replace singleton state with Map

Step 3.3: Add callback validation
  - Update startLocalServer to parse URL query params
  - Validate state from callback URL

Step 3.4: Verify
  - bun test tests/mcp/auth-oauth.test.ts
  - bun test tests/mcp/auth.test.ts
```

### Phase 4: Full Verification (5 min)

```
Step 4.1: Run full test suite
  - bun test --timeout 30000

Step 4.2: Run typecheck
  - bun run typecheck

Step 4.3: Run harness
  - Verify 6/6 checks pass

Step 4.4: Commit and push
  - git add .
  - git commit -m "fix: test isolation, type safety, OAuth PKCE"
  - git push
```

---

## Total Estimated Time: ~65-80 minutes

| Phase | Time | Risk |
|-------|------|------|
| Test Isolation | 5 min | Low — mechanical fix |
| Type Safety | 11 min | Low — targeted fixes |
| OAuth PKCE | 45-60 min | Medium — TDD cycle, crypto |
| Verification | 5 min | Low — just running checks |

---

## Simulation Results

| Check | Before | Expected After |
|-------|--------|----------------|
| Tests | 1035 pass, 0 fail | 1035+ pass, 0 fail |
| Typecheck | 28 errors | 0 errors |
| Stale DBs | None (clean state) | None |
| OAuth PKCE | Not implemented | Implemented |

**Note:** Tests pass from clean state. The 40 failures reported by CEO review were from stale DB directories on a different machine/state. The test isolation fix is still needed to prevent infinite failure loops on interrupted runs.

---

## Success Criteria

- [ ] 0 test failures (currently 40)
- [ ] 0 typecheck errors (currently 28)
- [ ] OAuth has PKCE with SHA-256 challenge
- [ ] Harness 6/6 passes
- [ ] All 1035+ tests pass
