# /vibe:plan — Next Iteration Design Document

**Date:** 2026-06-27
**Phase:** plan → break → build
**Current State:** 900 tests, 0 failures, 1436 simulation passes, 12/12 gaps closed

---

## CEO Review (Product Perspective)

### What's the 10-star version?
A fully autonomous self-improving AI platform that:
1. Learns from every codebase it touches (pattern extraction)
2. Remembers what worked via dreaming cycles (light→REM→deep)
3. Adapts its behavior based on evidence (cognitive engine)
4. Ships enterprise-grade code with zero regressions (TDD + simulation)
5. Evolves its own rules based on accumulated evidence

### Narrowest wedge that proves demand?
**The dreaming system.** If we can prove that memory consolidation (light→REM→deep) improves code quality over time, the entire platform has value.

### What's OUT of scope for this iteration?
- Plugin sandboxing (security theater, not real value yet)
- Multi-agent orchestration (premature optimization)
- Real-time collaboration (not core value)

---

## Eng Review (Architecture)

### Data Flow: Evidence → Dreaming → Improvement

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Retro     │───▶│   Evidence   │───▶│  Short-Term │
│   Phase     │    │   Builder    │    │   Recall    │
└─────────────┘    └──────────────┘    └──────┬──────┘
                                              │
                                              ▼
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   Rules     │◀───│    Deep      │◀───│    REM      │
│   Engine    │    │   Dreaming   │    │   Dreaming  │
└─────────────┘    └──────────────┘    └──────┬──────┘
                                              ▲
                                              │
                                       ┌──────┴──────┐
                                       │    Light    │
                                       │   Dreaming  │
                                       └─────────────┘
```

### Key Components

1. **Evidence Builder** (`src/learnings/evidence.ts`) ✅ DONE
   - Collects workflow success rates
   - Tracks skill effectiveness
   - Records tool issues with workarounds
   - Builds short-term recall entries

2. **Short-Term Recall Store** (`src/learnings/dreaming.ts`) ✅ DONE
   - SQLite-backed recall entries (512 max)
   - Recall counting and scoring
   - Concept tag extraction

3. **Dreaming Phases** (`src/learnings/dreaming.ts`) ✅ DONE
   - Light: Ingest + stage recent material
   - REM: Extract themes + reflections
   - Deep: Promote high-scoring candidates to long-term

4. **Long-Term Memory** (`src/learnings/dreaming.ts`) ✅ DONE
   - 4-layer architecture (working/episodic/semantic/dreams)
   - Temporal decay (Ebbinghaus)
   - Memory strength computation

### What's Missing (This Iteration)

1. **Dreaming Cron Integration** — Connect dreaming phases to a scheduler
2. **Memory Search Tool** — `memory_search` for context injection
3. **Rule Evolution Engine** — Apply promoted memories to change behavior
4. **State Auto-Update** — Prevent state drift after harness passes

### Test Matrix

| Component | Unit Tests | Integration | Simulation |
|-----------|-----------|-------------|------------|
| Evidence Builder | ✅ 11 | — | — |
| Dreaming Phases | ✅ 15 | — | ✅ 100 iter |
| Memory Manager | ✅ 5 | — | ✅ 100 iter |
| Plugin Lifecycle | ✅ 20 | — | ✅ 100 iter |
| Tool Policy | ✅ 12 | — | ✅ 100 iter |
| **Cron Integration** | ❌ TODO | ❌ TODO | ❌ TODO |
| **Memory Search** | ❌ TODO | ❌ TODO | ❌ TODO |
| **Rule Evolution** | ❌ TODO | ❌ TODO | ❌ TODO |

---

## Design Review

### Score: 7/10

**What a 10 looks like:**
- Dreaming runs automatically on cron schedule
- Memory search injects relevant context into every session
- Rule evolution proposes changes based on evidence
- State never drifts (auto-updated after every harness pass)
- CLI exposes memory search + dreaming status

**Current gaps:**
- No cron integration (dreaming is manual)
- No memory search tool (context injection missing)
- No rule evolution (learnings don't change behavior)
- State can drift (not auto-updated)

---

## Implementation Plan (S08-S12)

### S08: Dreaming Cron Integration
**Goal:** Automate light→REM→deep dreaming on schedule
**Tasks:**
- Create `src/learnings/cron.ts` — Dreaming scheduler
- Add `vibemate learn dream` CLI command
- Wire cron to existing dreaming phases
- Tests: scheduler fires phases in order

### S09: Memory Search Tool
**Goal:** Context injection via `memory_search`
**Tasks:**
- Create `src/learnings/search.ts` — Hybrid search (keyword + semantic)
- Add `memory_search` MCP tool
- Wire to dreaming short-term recall store
- Tests: search returns relevant memories

### S10: Rule Evolution Engine
**Goal:** Apply promoted memories to change behavior
**Tasks:**
- Create `src/evolve/rules.ts` — Rule proposal + approval
- Add `vibemate learn evolve` CLI command
- Wire deep dreaming promotions to rule changes
- Tests: promoted memories generate rule proposals

### S11: State Auto-Update
**Goal:** Prevent state drift
**Tasks:**
- Add post-harness state update hook
- Write test counts + harness results to state.json
- Tests: state.json always reflects current reality

### S12: Integration + Simulation
**Goal:** End-to-end validation
**Tasks:**
- Run full dreaming cycle with evidence data
- Validate memory search returns relevant results
- Validate rule evolution proposes changes
- Run 1000-iteration simulation loop

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cron doesn't fire on Windows | Medium | Low | Use setInterval fallback |
| Memory search too slow | Low | Medium | SQLite FTS5 index |
| Rule evolution too aggressive | Medium | High | Human approval gate |
| State auto-update breaks existing | Low | Medium | Backup before write |

---

## Success Criteria

1. ✅ Dreaming cron fires light→REM→deep automatically
2. ✅ `memory_search` returns relevant memories in <100ms
3. ✅ Rule evolution proposes changes (human approves)
4. ✅ State.json never drifts from reality
5. ✅ 1000-iteration simulation passes with 0 failures
6. ✅ All 900+ existing tests still pass
