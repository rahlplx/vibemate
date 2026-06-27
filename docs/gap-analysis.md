# Vibemate Gap Analysis — vs OpenClaw, NemoClaw, KiloClaw

**Date:** 2026-06-27
**Analyst:** AI (automated)

---

## Executive Summary

After analyzing 3 production-grade agent platforms (OpenClaw 300K+ stars, NemoClaw 17K stars, KiloClaw commercial), we identified **12 critical gaps** in vibemate's architecture. The most impactful are: no security layer, no plugin lifecycle, no memory consolidation, and no typed failure classification.

---

## Gap Matrix

| # | Gap | Severity | OpenClaw Has | NemoClaw Has | Vibemate Has | Effort |
|---|-----|----------|--------------|--------------|--------------|--------|
| 1 | **Security layer** (SSRF, secret scanning, credential sanitization) | CRITICAL | 81 files in src/security/ | Full SSRF + secret scanner + credential filter | None | High |
| 2 | **Plugin lifecycle** (manifest, hooks, registry, discovery) | HIGH | 532 files in src/plugins/ | Plugin manifest + registration | MCP only | High |
| 3 | **Typed failure classification** (kind/reason/nextStep) | HIGH | Error utilities | AccessFailureClassification | Generic errors | Medium |
| 4 | **Tool policy pipeline** (8-layer ordered policies) | HIGH | Full pipeline | Network policies | None | High |
| 5 | **Memory dreaming** (light/deep/REM consolidation) | MEDIUM | Full dreaming system | None | None | High |
| 6 | **Config schema** (JSON Schema + UI hints) | MEDIUM | 39 type modules + Zod | Blueprint schema | Zod only | Medium |
| 7 | **Gated test projects** (env-var gated E2E) | MEDIUM | 87+ vitest configs | 6 gated projects | All tests run together | Low |
| 8 | **Skill discovery pipeline** (eligibility, loading, runtime) | MEDIUM | Full pipeline | None | Manual loading | Medium |
| 9 | **Session lifecycle events** | LOW | Lifecycle events + listeners | None | None | Medium |
| 10 | **AGENTS.md** (AI-facing documentation) | LOW | Comprehensive AGENTS.md | AGENTS.md | None | Low |
| 11 | **Subagent registry** (depth limits, orphan recovery) | LOW | Full registry | None | None | High |
| 12 | **Tool availability expressions** (boolean composable) | LOW | Full system | None | None | Medium |

---

## Priority 1: Security Layer (CRITICAL)

**What openclaw/NemoClaw have that we don't:**

1. **SSRF protection** — DNS pinning, private network blocking, scheme allowlists
2. **Secret scanning** — Pattern-based detection of API keys, tokens, PEM keys
3. **Credential sanitization** — Recursive stripping from config files
4. **Redaction system** — Partial/full/log redaction modes
5. **Filesystem policy** — Path traversal prevention, boundary reads
6. **Install policy** — Plugin trust validation

**Our current state:** Zero security infrastructure. No secret scanning, no SSRF protection, no credential management.

**Recommended action:** Implement `src/security/` module with:
- `secret-scanner.ts` — Pattern-based secret detection
- `credential-filter.ts` — Config file sanitization
- `redact.ts` — Multi-mode redaction
- `ssrf.ts` — URL validation with DNS pinning

---

## Priority 2: Plugin Lifecycle (HIGH)

**What openclaw has:**
- `openclaw.plugin.json` manifest with typed contracts
- `definePluginEntry()` / `defineBundledChannelEntry()` entry patterns
- 70+ registration methods (tools, hooks, channels, providers, CLI, HTTP, memory)
- 30+ named hooks with typed Event/Result pairs
- Plugin discovery from bundled, workspace, global, package, bundle sources
- Plugin slots (only one active per kind)

**Our current state:** MCP server only. No plugin manifests, no hook system, no discovery pipeline.

**Recommended action:** Implement `src/plugins/` module with:
- Plugin manifest schema
- Plugin registry with lifecycle hooks
- Hook system with typed events
- Plugin discovery from multiple sources

---

## Priority 3: Typed Failure Classification (HIGH)

**What NemoClaw has:**

```typescript
type AccessFailureKind = "blocked-by-policy" | "missing-approval" | "unsupported" | "unknown";
interface AccessFailureClassification {
  kind: AccessFailureKind;
  reason: string;      // human-readable
  nextStep: string;     // actionable remediation
  matchedPreset?: string;
  confidence: "high" | "low";
}
```

**Our current state:** Generic error classes with string messages. No structured failure classification.

**Recommended action:** Add `src/shared/failure-classification.ts`:
- `FailureKind` type with all failure categories
- `FailureClassification` interface with kind/reason/nextStep/confidence
- `classifyFailure()` function that maps errors to classifications
- Integration with audit findings and RL signals

---

## Priority 4: Tool Policy Pipeline (HIGH)

**What openclaw has:**

```
1. tools.profile              -> base profile
2. tools.byProvider.profile   -> provider override
3. tools.allow                -> global allow/deny
4. tools.byProvider.allow     -> provider allow/deny
5. agents.<id>.tools.allow    -> per-agent allow/deny
6. agents.<id>.tools.byProvider.allow -> per-agent per-provider
7. group tools.allow          -> per-group/channel
8. tools.toolsBySender        -> per-sender
```

**Our current state:** No tool policy system. All tools available to all agents.

**Recommended action:** Implement `src/governance/tool-policy.ts`:
- Ordered policy layers
- Profile-based tool sets
- Per-agent overrides
- Tool availability expressions

---

## Priority 5: Memory Dreaming (MEDIUM)

**What openclaw has:**

```
Light Dreaming  -> deduplicates short-term memories (every 6h)
Deep Dreaming   -> promotes frequently-recalled snippets (min recall: 3)
REM Dreaming    -> discovers cross-session patterns (min strength: 0.75)
```

**Our current state:** Basic SQLite state. No consolidation, no dreaming, no vector search.

**Recommended action:** Implement `src/learnings/dreaming.ts`:
- Light/deep/REM phases
- Recall-count-based promotion
- Similarity-based dedup
- Configurable cron schedules

---

## Priority 6: Config Schema (MEDIUM)

**What openclaw has:**
- 39 separate type files covering every domain
- JSON Schema generation from Zod
- UI hints (label, help, tags, advanced, sensitive, placeholder)
- Config IO with backup rotation and recovery
- Environment variable substitution
- Merge-patch with proto-pollution guards

**Our current state:** Zod schemas only. No JSON Schema, no UI hints, no backup/recovery.

**Recommended action:** Extend `src/shared/config.ts`:
- JSON Schema generation
- UI hints for config fields
- Config backup/rotation
- Proto-pollution protection

---

## Priority 7: Gated Test Projects (MEDIUM)

**What openclaw/NemoClaw have:**
- 87+ vitest project configs (openclaw)
- 6 gated projects (NemoClaw)
- Env-var gating for E2E tests
- Separate unit/integration/e2e/contract/boundary test configs
- Custom test runners for shared-state tests

**Our current state:** Single bun test config. All tests run together.

**Recommended action:** Update `bunfig.toml`:
- Separate unit, integration, e2e test profiles
- Env-var gating for slow tests
- Coverage threshold ratcheting

---

## Priority 8: Skill Discovery Pipeline (MEDIUM)

**What openclaw has:**
- Discovery from bundled, workspace, plugin sources
- Eligibility checks (OS, required bins, env vars, config)
- Loading with frontmatter parsing
- Runtime with session snapshots
- Skill types (userInvocable, disableModelInvocation)
- XML injection into system prompt

**Our current state:** Manual skill loading. No discovery, no eligibility, no runtime snapshots.

**Recommended action:** Implement `src/skills/discovery.ts`:
- Multi-source discovery
- Eligibility checking
- Frontmatter parsing
- Session-scoped snapshots

---

## Recommended Implementation Order

1. **Security layer** (CRITICAL) — Start here. Security is non-negotiable.
2. **Typed failure classification** (HIGH, low effort) — Quick win, high impact.
3. **Config schema extensions** (MEDIUM, medium effort) — Improves DX.
4. **Gated test projects** (MEDIUM, low effort) — Improves CI.
5. **AGENTS.md** (LOW, low effort) — Improves AI collaboration.
6. **Plugin lifecycle** (HIGH, high effort) — Architecture foundation.
7. **Tool policy pipeline** (HIGH, high effort) — Architecture foundation.
8. **Memory dreaming** (MEDIUM, high effort) — Long-term memory.

---

## Source Repos Analyzed

| Repo | Stars | Key Strength | License |
|------|-------|--------------|---------|
| openclaw/openclaw | 300K+ | Plugin ecosystem, memory dreaming, tool policies | MIT |
| NVIDIA/NemoClaw | 17K | Security (SSRF, secret scanning, sandboxing) | Apache 2.0 |
| kiloclaw (fulvian fork) | — | 4-layer memory, multi-agency orchestration | MIT |
