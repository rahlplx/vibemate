# Vibemate Next-Gen: Structured Brainstorm & Adaptation Plan
**Date:** 2026-06-27  
**Source docs:** Manus Framework (5 docs) + Vibemate Next-Gen Architecture + Sprint Breakdown + Implementation Plan  
**Purpose:** Extract learnings, identify gaps, produce a token-efficient implementation roadmap tailored to the existing codebase

---

## 1. Current State Audit

### 1.1 What Already Exists (do not rebuild)

| Module | Path | Status |
|--------|------|--------|
| MCP Server | `src/mcp/` | ✅ Complete — spec, auto-complete, auto-fix, auth, stack detection |
| Cost-Aware Router | `src/router/` | ✅ Complete — Anthropic/Google/OpenAI by complexity tier |
| Context Pipeline | `src/context/` | ✅ Complete — AST extraction, LLMLingua, DLP masking, cache |
| Discovery Engine | `src/discovery/` | ✅ Complete — question bank, tree, ambiguity scoring |
| Decision Engine | `src/decision/` | ✅ Complete — comparison matrix, weighted scorer |
| Scaffold Generator | `src/scaffold/` | ✅ Complete — SaaS/API/CLI templates, file writer |
| Execution Gate | `src/execution/` | ✅ gate.ts (complexity), dispatcher.ts, observation.ts |
| State / SQLite | `src/state/` | ✅ Complete — Bun + Node adapters, migrations, CRUD |
| Telemetry | `src/telemetry/` | ✅ Spans + traces — **missing: loop detection, bounded retention, anomaly detection** |
| Evolve / Self-Improve | `src/evolve/` | ✅ AEL two-timescale, Thompson sampling, EvolveR-style lifecycle |
| Improve | `src/improve/` | ✅ Observation engine, confidence-thresholded insights |
| Auth | `src/mcp/auth.ts` | ✅ JWT, OAuth2, tier system (free/pro/team/enterprise) |
| Governance | `src/governance/engine.ts` | ✅ Exists — needs audit log UI wiring |
| Scaling | `src/scaling/` | ✅ auto-scaler, connection-pool, worker-pool — needs UI |
| Security | `src/security/` | ✅ credential-filter, redact, secret-scanner, tool-policy |
| Performance | `src/performance/` | ✅ cache, monitor |
| SDD | `src/sdd/` | ✅ intent extraction, gap analysis, quality scoring |
| OKF | `src/okf/` | ✅ Markdown-with-frontmatter knowledge bundle |
| 12-Phase Pipeline | `src/cli/auto.ts` | ✅ THINK→DONE state machine + circuit breakers |
| Compiler | `src/compiler/` | ✅ Multi-platform agent compilation |
| Plugins | `src/plugins/` | ✅ Plugin lifecycle, 8-layer tool policy |
| Server (Hono) | `src/server/` | ✅ REST API + basic dashboard UI |

### 1.2 Confirmed Gaps (build these, in priority order)

| Gap | Priority | Manus Principle | Next-Gen Plan Phase |
|-----|----------|-----------------|---------------------|
| Telemetry: loop detection + bounded span retention | **P0** | Observability & Telemetry | Phase 3 |
| Telemetry: anomaly detection | **P1** | Observability & Telemetry | Phase 3 |
| Knowledge Base: vector embeddings + RAG pipeline | **P1** | Context Management + SDD | Phase 9 |
| Frontend: real-time dashboard (WebSocket/SSE) | **P1** | Output Generator | Phase 11 |
| E2E + load tests (Playwright + k6) | **P2** | QA Framework | Phase 12 |
| CI/CD pipeline (GitHub Actions) | **P2** | Automated Validation | Phase 1 |
| Event Bus / async service communication | **P3** | Tool Orchestrator | Phase 2 |
| IaC / Docker Compose for local dev | **P3** | Developer Experience | Phase 1 |
| Vibemate Doctor health check (Settings Panel) | **P3** | QA Framework | Phase 11 |
| Distributed trace propagation (cross-service) | **P3** | Telemetry | Phase 3 |

---

## 2. Manus Framework Learnings → Vibemate Adaptations

### 2.1 Agent Loop → Enhance 12-Phase Pipeline

**Manus pattern:**  
`Analyze Context → Think → Select Tool → Execute → Observe → Iterate → Deliver`

**Current Vibemate gap:** The 12-phase pipeline executes phases but has weak observation/feedback between phases. Each phase writes a handoff doc but doesn't feed structured observations back into the circuit breaker.

**Adaptation:**  
Wire `src/execution/observation.ts` outputs into each phase transition. After every `PHASE_EXECUTION`, record a structured observation (success rate, token cost, blockers) before advancing `PHASE_TRANSITIONS`. This turns the linear state machine into the Manus agent loop within each phase.

```
Phase N → executePhase() → ObservationEngine.capture() → CircuitBreaker.check() → Phase N+1
```

### 2.2 Query-to-Output Pipeline → SDD Spec Chain

**Manus pattern:** User query → Intent → Plan → Tool → Observe → Reason → Output

**Current Vibemate:** `src/sdd/` has intent extraction and gap analysis but they are not wired into the 12-phase pipeline entry point (`vibemate auto`).

**Adaptation:** Add a pre-flight SDD step before THINK phase:
1. `intent-extractor.ts` → parse user description into structured IntentSpec
2. `gap-analyzer.ts` → compare IntentSpec vs existing codebase
3. `quality-scorer.ts` → set baseline quality score for RETRO comparison

### 2.3 Token-Efficient Embedding Strategy

**Manus principle:** Context management with semantic compression before sending to LLMs.

**Current Vibemate:** `src/context/pipeline.ts` does AST extraction + LLMLingua compression + DLP masking. **Missing: vector embedding layer for semantic retrieval.**

**Adaptation — 3-layer embedding stack:**

```
Layer 1: DLP mask (strip secrets)           → already done
Layer 2: AST-aware compression (LLMLingua)  → already done  
Layer 3: Vector embedding (NEW)             → embed compressed chunks
         → store in .vibe/embeddings/ (FAISS-compatible JSON)
         → retrieve top-K by cosine similarity before each LLM call
         → inject only relevant chunks into prompt
```

**Token budget enforcement:**  
Use `src/context/token-budget.ts` to cap per-phase token spend. Route low-complexity phases (RETRO, LEARN) to `claude-haiku` via the existing router. Reserve `claude-opus` for THINK and REVIEW.

### 2.4 Decision Trees → Router Enhancement

**Manus pattern:** Contextual decision nodes — task goal + phase + observations + constraints → optimal action.

**Current Vibemate:** `src/router/index.ts` routes by complexity tier (low/medium/high). No phase-awareness.

**Adaptation:** Extend `RoutingDecision` with phase context:
```typescript
interface RoutingDecision {
  model: string;
  provider: string;
  phase?: AutoPhase;          // NEW — phase-aware routing
  observationScore?: number;  // NEW — from ObservationEngine
  estimatedCost: number;
  rationale: string;
}
```
THINK + REVIEW → opus; PLAN + BREAK + BUILD → sonnet; HARNESS + RETRO + LEARN → haiku.

### 2.5 Spec-Driven Test Generation

**Manus TDD:** Specs → failing tests → implementation → green → refactor.

**Current Vibemate:** TDD rule exists in CLAUDE.md but `SPEC.md` is not auto-parsed into test stubs.

**Adaptation:** Add a `vibemate spec:tests` CLI command that:
1. Reads `SPEC.md` feature list
2. Calls `src/sdd/intent-extractor.ts` on each feature
3. Generates test stubs in `tests/<module>/` using naming convention from docs
4. Writes to `.vibe/generated-tests.json` for traceability

### 2.6 Quality Gates → Harness Enhancement

**Manus QA:** Quality gates at each pipeline stage — test pass rate, security scan, performance benchmarks.

**Current Vibemate:** `src/cli/auto.ts` HARNESS phase runs checks but they are informal.

**Adaptation — Formal quality gate matrix:**

| Gate | Threshold | Action on Fail |
|------|-----------|---------------|
| Unit test pass rate | ≥95% | Loop HARNESS (circuit breaker after 3) |
| TypeScript errors | 0 | Block BUILD→HARNESS transition |
| DLP scan | 0 secrets | Block any phase that touches context pipeline |
| Token budget | <80% of limit | Warn; >100% halts BUILD |
| Telemetry span count | <500 active | Warn; >1000 triggers bounded eviction |

---

## 3. Token-Efficient Workflow Design

### 3.1 Prompt Architecture Per Phase

```
┌─────────────────────────────────────────────────────────────┐
│ SYSTEM: Phase-specific persona (150-200 tokens max)         │
│ CONTEXT: RAG-retrieved OKF chunks (top-3, ~500 tokens)      │
│ STATE: Serialized AutoState (compressed, ~200 tokens)        │
│ TASK: Phase skill from skills/vibe-*.md (~300 tokens)        │
│ HISTORY: Last handoff doc only (~150 tokens)                 │
│ TOOLS: Phase-relevant subset only (not all tools)            │
└─────────────────────────────────────────────────────────────┘
Target: ~1300 tokens input per phase (vs current unbounded)
```

### 3.2 Cache Strategy

- **Prompt cache:** Phase system prompts are static → Anthropic cache-control prefix. Saves ~60% of repeated tokens.
- **OKF cache:** `.vibe/context-cache/` already exists. Add TTL invalidation on `.vibe/` write.
- **Embedding cache:** `.vibe/embeddings/<file-hash>.json`. Recompute only on file change.
- **Skill cache:** `skills/vibe-*.md` rarely change → cache their embeddings at startup.

### 3.3 Tool Call Efficiency (from Manus Executable Scripts doc)

**Manus principle:** Parallel execution for independent sub-tasks; sequential only when dependent.

**Vibemate adaptation for BREAK phase (task decomposition):**
```typescript
// Current: sequential task creation
for (const task of tasks) await dispatcher.dispatch(task);

// Target: parallel dispatch with dependency graph
const { independent, dependent } = partitionByDependencies(tasks);
await Promise.all(independent.map(t => dispatcher.dispatch(t)));
for (const t of dependent) await dispatcher.dispatch(t); // sequential
```

---

## 4. Implementation Roadmap (Vibemate-Tailored)

Collapsed from 28 sprints to 8 focused milestones. Each milestone maps to the highest-value next-gen features that don't already exist.

### Milestone 1: Telemetry Hardening (Week 1-2) — P0

**TDD cycle:** Write failing tests first in `tests/telemetry/`

Tasks:
- [ ] Loop detection: track tool call chains per trace, detect cycles via DFS in `TelemetryCollector`
- [ ] Bounded span retention: evict spans >500 count or >50MB; add `evict()` method with LRU policy
- [ ] Anomaly detection: statistical baseline per span name (μ ± 2σ); flag outliers in `exportMetrics()`
- [ ] Tests: `tests/telemetry/loop-detection.test.ts`, `span-retention.test.ts`, `anomaly.test.ts`

Acceptance: `bun test tests/telemetry/` green; no memory growth after 1000-span stress test.

### Milestone 2: RAG + Vector Embedding (Week 3-4) — P1

**TDD cycle:** Write embedding test against known OKF chunks first.

Tasks:
- [ ] Add `src/context/embeddings.ts` — embed OKF chunks using `@anthropic-ai/sdk` text embedding
- [ ] Store as `.vibe/embeddings/<hash>.json` with cosine similarity retrieval
- [ ] Wire into `ContextPipeline.process()` — inject top-3 chunks before each LLM call
- [ ] Add `vibemate context:embed` CLI command to pre-warm embedding cache
- [ ] Tests: `tests/context/embeddings.test.ts`

Acceptance: RAG retrieval returns relevant OKF chunks for test queries with >80% relevance score.

### Milestone 3: Pipeline Observation Loop (Week 5) — P1

Tasks:
- [ ] Wire `src/execution/observation.ts` into each phase transition in `auto.ts`
- [ ] Capture: phase duration, token cost, error count, circuit breaker state
- [ ] Feed observation score back into `CostAwareRouter` for next phase model selection
- [ ] Extend `AutoState` with `observations: PhaseObservation[]`
- [ ] Tests: `tests/cli/observation-loop.test.ts`

### Milestone 4: Real-Time Dashboard (Week 6-7) — P1

Tasks:
- [ ] Upgrade `src/server/` Hono app with SSE endpoint (`/events`)
- [ ] Push telemetry spans as SSE events from `TelemetryCollector`
- [ ] Update `src/ui/` dashboard with live metrics (pipeline status, token cost, span count)
- [ ] Add Vibemate Doctor: one-click health check button → calls all service checks
- [ ] Tests: `tests/server/sse.test.ts`

Acceptance: Dashboard renders pipeline state within 1s of phase change.

### Milestone 5: Quality Gate Matrix (Week 8) — P2

Tasks:
- [ ] Formalize HARNESS gate checks as typed `HarnessCheck[]` in `src/cli/auto.ts`
- [ ] Add TypeScript gate: run `tsc --noEmit`, fail if errors > 0
- [ ] Add token budget gate: compare `.vibe/telemetry/` cost vs `CircuitBreaker.maxBudget`
- [ ] Add DLP gate: scan handoff docs for unmasked secrets before phase advance
- [ ] Tests: `tests/cli/harness-gates.test.ts`

### Milestone 6: CI/CD + E2E Testing (Week 9-10) — P2

Tasks:
- [ ] `.github/workflows/ci.yml` — `bun test`, `bun run typecheck`, `bun run build` on every push
- [ ] `tests/e2e/discovery-flow.e2e.ts` — Playwright: run `vibemate discover`, answer Qs, assert intent
- [ ] `tests/e2e/scaffold-flow.e2e.ts` — Playwright: scaffold SaaS project, verify files exist
- [ ] Load test: k6 script for MCP server (`/spec` tool) at 50 concurrent sessions

Acceptance: CI green on push to `main`; E2E passes; MCP server handles 50 req/s.

### Milestone 7: Spec-Driven Test Generation (Week 11) — P2

Tasks:
- [ ] `vibemate spec:tests` CLI command in `src/cli/`
- [ ] Parse `SPEC.md` → extract features via `src/sdd/intent-extractor.ts`
- [ ] Generate test stub files following naming convention
- [ ] Write generated stubs to `tests/<module>/` with `// TODO: implement` markers
- [ ] Log generated tests to `.vibe/generated-tests.json`

### Milestone 8: Docker + Local Dev Environment (Week 12) — P3

Tasks:
- [ ] `docker-compose.yml` — vibemate service + SQLite volume mount
- [ ] `.env.example` with all required vars (no secrets)
- [ ] `Dockerfile` for production build
- [ ] Update `CLAUDE.md` with Docker workflow
- [ ] Tests: `bun test` passes inside container

---

## 5. Key Architectural Constraints (Hard Requirements)

From the Next-Gen Architecture doc — these are non-negotiable:

1. **Path traversal in Scaffold Generator is STRICTLY prohibited.** Already in `src/scaffold/` but add fuzz tests (Milestone 6).
2. **Span retention MUST be bounded** to prevent memory leaks. (Milestone 1, P0).
3. **Tier labels are EXACTLY:** Free, Pro, Team, Enterprise — no variation. Already in `src/mcp/auth.ts`.
4. **Health check is internally labeled "vibemate doctor equivalent"** — not "health check" in code.
5. **DLP masking before ANY LLM call** — enforce at `ContextPipeline.process()` level, not optionally.

---

## 6. Learnings Index (for OKF logging)

Quick-reference extractions from this session:

| # | Learning | Source | Apply To |
|---|----------|--------|----------|
| L1 | Manus agent loop = observe after EVERY tool call, not just phase end | Manus System Architecture | `src/cli/auto.ts` phase transitions |
| L2 | Token efficiency: RAG top-K retrieval beats full-context injection 3:1 on cost | Manus Context Management | `src/context/pipeline.ts` |
| L3 | Parallel tool dispatch for independent tasks; sequential only for dependencies | Manus Executable Scripts | `src/execution/dispatcher.ts` |
| L4 | Bounded span retention is an architectural constraint, not a nice-to-have | Next-Gen Architecture §7 | `src/telemetry/collector.ts` |
| L5 | Phase-aware LLM routing saves ~40% token cost vs flat complexity routing | Decision Trees doc | `src/router/index.ts` |
| L6 | Spec → test stubs → implementation is the TDD chain; SPEC.md is the source of truth | Manus TDD doc | `src/sdd/` + `vibemate spec:tests` |
| L7 | Quality gates must be typed, measurable, and have explicit fail actions | Manus QA Framework | HARNESS phase in `auto.ts` |
| L8 | Abductive reasoning (best hypothesis from limited evidence) = failure classification | Manus Reasoning doc | `src/shared/failure-classification.ts` |
| L9 | DLP must run before embedding, not after — embeddings can leak secrets | DLP pipeline analysis | `src/context/pipeline.ts` ordering |
| L10 | Contextual upgrade prompts need A/B tracking — not just show/hide by tier | Next-Gen Architecture §4.2 | `src/mcp/auth-middleware.ts` |

---

## 7. What NOT to Build (Scope Exclusions)

The next-gen plan includes items that are premature or mismatched for the current stage:

| Excluded | Reason |
|----------|--------|
| Terraform / IaC for AWS Lambda | Solo dev — serverless infra is future commercial scale concern |
| Neo4j / ArangoDB graph database | OKF markdown bundle + vector embeddings covers the RAG need; graph DB adds ops overhead |
| RabbitMQ / Kafka event bus | No multi-service topology yet; direct Bun function calls are sufficient |
| ML model training pipeline | Decision engine uses scoring + LLM recommendations; custom ML is premature |
| WCAG 2.1 AA UI compliance audit | Low ROI at current stage; ship real-time dashboard first |
| SOC 2 / ISO 27001 compliance | Commercial milestone, not an engineering milestone |
| On-call rotation / PagerDuty | Solo developer context |

---

## 8. Next Action (Single Next Step)

**Start Milestone 1 with TDD:**

```bash
# Write the failing test first
touch tests/telemetry/loop-detection.test.ts
touch tests/telemetry/span-retention.test.ts

# Then implement
# src/telemetry/collector.ts — add detectLoops() + evict() methods

# Verify
bun test tests/telemetry/
```

This unblocks Milestone 3 (observation loop) and directly addresses the P0 architectural constraint from the next-gen spec.
