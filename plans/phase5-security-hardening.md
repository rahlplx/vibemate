# Phase 5: Enterprise Security & Architecture Hardening

## Audit Findings Verified

### Critical (Must Fix)

| ID | Issue | File | Status |
|----|-------|------|--------|
| SEC-002 | `exchangeCode` is a stub — any string grants a valid token | `src/mcp/auth.ts:74-83` | ✅ VERIFIED |
| SEC-003 | OAuth callback never reads the callback; login always "succeeds" | `src/mcp/auth.ts:85-99`, `src/cli/index.ts:155-158` | ✅ VERIFIED |
| SEC-005 | `ANTHROPIC_API_KEY` accepted via `--api-key` CLI flag | `src/cli/index.ts:28,67` | ✅ VERIFIED |
| F02 | `JWT_SECRET!` non-null assertion in scaffolded templates | `src/scaffold/templates.ts:132,156,175` | ✅ VERIFIED |
| F04 | Auth tokens in-process memory only; lost on every restart | `src/cli/index.ts:131,170,179` | ✅ VERIFIED |

### High (Should Fix)

| ID | Issue | File | Status |
|----|-------|------|--------|
| ARCH-001/002/003 | Domain modules own SQLite connection lifecycle | `src/discovery/index.ts`, `src/execution/dispatcher.ts`, `src/improve/observation.ts` | ✅ VERIFIED |
| SEC-004 | Auth middleware built but never wired into tool dispatch | `src/mcp/index.ts:138` | ✅ VERIFIED |
| PERF-001 | Synchronous `readFileSync` in HTTP request handler | `src/server/api.ts:173-174` | ✅ VERIFIED |
| PERF-003 | Unbounded in-memory context cache (no eviction) | `src/context/pipeline.ts:46-179` | ✅ VERIFIED |
| RELY-005 | WorkerPool error never rejects the in-flight promise | `src/scaling/worker-pool.ts:87-91` | ✅ VERIFIED |

### Medium (Next Sprint)

| ID | Issue | File | Status |
|----|-------|------|--------|
| TS-003 | `JSON.parse` results cast without runtime validation at 17 sites | `src/mcp/config.ts:152` + 16 others | ✅ VERIFIED |
| PERF-004 | LRU eviction is O(n) full scan | `src/performance/cache.ts:122` | ✅ VERIFIED |
| F07 | Duplicate `McpLogger` — stdout logging corrupts MCP stdio | `src/mcp/index.ts:17` | ✅ VERIFIED |
| F11 | No queue size cap; no SIGTERM hook on WorkerPool | `src/scaling/worker-pool.ts` | ✅ VERIFIED |

## Implementation Plan

### Step 1: Token Persistence (F04)
Create `src/mcp/auth-store.ts` with filesystem-based token storage.

### Step 2: Real OAuth Token Exchange (SEC-002)
Implement actual HTTP call to token endpoint in `exchangeCode`.

### Step 3: Real OAuth Callback Server (SEC-003)
Replace TCP listener with HTTP server that reads callback params.

### Step 4: Remove API Key CLI Flag (SEC-005)
Remove `-k, --api-key` option; require env var.

### Step 5: Safe JWT_SECRET in Templates (F02)
Replace `process.env.JWT_SECRET!` with explicit check.

### Step 6: Async File Read in API (PERF-001)
Replace `readFileSync` with `await readFile`.

### Step 7: Cache Eviction (PERF-003)
Add LRU eviction with max entries and max bytes.

### Step 8: WorkerPool Error Rejection (RELY-005)
Add `activeReject` to WorkerInfo; reject on error.

### Step 9: O(1) LRU Eviction (PERF-004)
Use Map insertion-order for O(1) eviction.

### Step 10: Wire Auth Middleware (SEC-004)
Wire `createAuthMiddleware` into MCP tool dispatch.

### Step 11: Tests for all changes

## Reference Patterns (from cloned repos)

- **OAuth**: Vercel AI MCP `OAuthClientProvider` interface pattern
- **Hexagonal**: Vercel Chat `StateAdapter` port pattern
- **Error Handling**: Vercel AI Symbol-marked error hierarchy
- **Token Persistence**: Aider `~/.aider/` filesystem pattern
- **Token Encryption**: Vercel Chat AES-256-GCM pattern
