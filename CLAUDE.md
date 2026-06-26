# Claude Code Context - Vibemate

## Project Context

Vibemate is an AI-native product platform with adaptive brainstorming, spec-driven planning, autonomous building, and self-improvement capabilities.

**Goal:** Open source core with commercial enterprise features. Use in-house first, then launch commercially.

## Architecture

### Core Platform (Commercial)
- **cli/auto.ts** — 13-phase autonomous pipeline (THINK → PLAN → DESIGN → BREAK → BUILD → HARNESS → REVIEW → QA → SHIP → RETRO → LEARN → EVOLVE → TELEMETRY)
- **cli/evolve.ts** — Self-improvement orchestrator
- **compiler/** — Agent compilation for multi-platform
- **context/** — Context engineering pipeline
- **mcp/** — MCP server configuration
- **okf/** — OKF bundle generator (knowledge management)
- **router/** — Cost-aware LLM routing
- **telemetry/** — OpenTelemetry integration

### Business Logic (OSS)
- **shared/** — Error hierarchy, Zod schemas, config validation
- **state/** — SQLite connection, migrations, CRUD store
- **discovery/** — Question bank, dynamic question tree, ambiguity scoring
- **decision/** — Comparison matrix, scorer, benchmark data
- **scaffold/** — Templates, file writer, generator
- **execution/** — Complexity gate, task dispatcher
- **improve/** — Observation engine, insights
- **cli/** — discover, scaffold, decide commands

## Test Results

**266 tests passing across 29 test files**

| Module | Tests | Status |
|--------|-------|--------|
| shared | 34 | ✅ |
| state | 23 | ✅ |
| discovery | 32 | ✅ |
| decision | 25 | ✅ |
| scaffold | 16 | ✅ |
| execution | 16 | ✅ |
| improve | 4 | ✅ |
| cli | 6 | ✅ |
| existing | 110 | ✅ |

## Dependencies

- **Runtime:** Bun primary, Node.js fallback
- **Database:** SQLite via better-sqlite3
- **Testing:** vitest 3.2.6
- **TypeScript:** strict mode

## Open Source Strategy

### Core (Commercial)
- MCP server
- Skills engine
- Registry
- UI utilities
- Telemetry
- Evolve pipeline

### OSS (Free)
- CLI commands
- Discovery engine
- Decision engine
- Scaffold generator
- Documentation

## Rules

1. Always follow TDD: write failing test first
2. Check OKF bundle for architectural decisions before implementing
3. Use MCP servers for documentation and testing
4. Log learnings to OKF bundle after completing tasks

## Telemetry

All actions are logged to `.vibe/telemetry/` for retrospective analysis.
