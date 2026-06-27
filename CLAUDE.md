# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

Vibemate is an AI-native product platform that ships as an MCP server plugging into AI coding tools (Claude Code, Cursor, Codex, Kilocode, OpenCode). It gives solo founders and small teams enterprise-grade patterns through curated skills and a 13-phase autonomous pipeline.

## Commands

```bash
# Development
bun run dev             # CLI in watch mode
bun run dev:mcp         # MCP server in watch mode

# Testing
bun test                # Run all tests
bun test --watch        # Watch mode
bun test --coverage     # With coverage
bun test tests/shared/  # Run a single module's tests
bun test tests/shared/errors.test.ts  # Run a single file

# Build & Type Check
bun run build           # Build CLI + MCP server
bun run typecheck       # tsc --noEmit
bun run clean           # Remove dist/
```

Prefer `bun test` over `npm test`. Tests use vitest (configured via `bunfig.toml`). `tsconfig.json` excludes `tests/` from compilation — type-check only runs over `src/`.

## Architecture

### Entry Points
- `src/cli/index.ts` — CLI entry (`vibemate` binary), registers all subcommands
- `src/mcp/index.ts` — MCP server entry (`vibemate-mcp` binary), exposes tools over stdio transport

### 13-Phase Autonomous Pipeline (`src/cli/auto.ts`)
The `vibemate auto "<description>"` command runs a state machine through: THINK → PLAN → DESIGN → BREAK → BUILD → HARNESS → REVIEW → QA → SHIP → RETRO → LEARN → DONE. Each phase maps to a skill file in `skills/vibe-*.md`. Circuit breakers (budget, failure count, dispatch count) halt the pipeline. State is persisted to `.vibe/`.

### Commercial Modules (`src/`)
| Module | Role |
|--------|------|
| `mcp/` | MCP server, tool definitions (`spec`, `auto-complete`, `auto-fix`), auth, stack detection |
| `router/` | Cost-aware LLM routing across Anthropic/Google/OpenAI models by complexity tier |
| `context/` | Context engineering pipeline: AST extraction, LLMLingua compression, DLP masking, cache |
| `compiler/` | Agent compilation for multi-platform output |
| `okf/` | OKF (Open Knowledge Format) bundle generator — markdown-with-frontmatter knowledge base |
| `telemetry/` | OpenTelemetry collector; all spans written to `.vibe/telemetry/` |
| `evolve/` | Self-improvement orchestrator (`SelfImprovementOrchestrator`) |
| `plugins/` | Plugin architecture for extending skills |
| `sdd/` | Spec-Driven Development: intent extraction, gap analysis, quality scoring |

### OSS Business Logic (`src/`)
| Module | Role |
|--------|------|
| `shared/` | Error hierarchy, Zod schemas, config validation, logger, AST parser, failure classification |
| `state/` | SQLite connection (Bun + Node adapters), migrations, CRUD store |
| `discovery/` | Question bank, dynamic question tree, ambiguity scoring |
| `decision/` | Technology comparison matrix, weighted scorer, benchmark data |
| `scaffold/` | Project templates (SaaS, API, CLI), file writer, generator |
| `execution/` | Complexity gate (inline/session/subagent routing), task dispatcher |
| `improve/` | Observation engine, confidence-thresholded insights |

### Key Cross-Cutting Concerns
- **OKF bundle** — architectural decisions are stored in OKF-formatted markdown under `.vibe/`. Check it before implementing anything significant.
- **DLP pipeline** — `src/context/pipeline.ts` auto-masks secrets (AWS keys, JWTs, connection strings, env vars) before sending context to LLMs.
- **Type system** — All shared types are in `src/types.ts`. Module-local types stay in the module.
- **Skills** — `skills/vibe-*.md` are the prompt files executed by each pipeline phase. `skills/learn-*` are self-improvement skill stubs.

## Rules

1. **TDD:** Write a failing test first, then implement.
2. **OKF first:** Check the OKF bundle (`.vibe/`) for prior architectural decisions before implementing.
3. **Log learnings:** After completing tasks, log insights to the OKF bundle.
4. **Telemetry:** All actions emit spans to `.vibe/telemetry/` for retrospective analysis.
