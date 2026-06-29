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

# EvolveAgent — call daily via CI cron; internally guards to weekly cadence
vibemate evolve --cron
```

Prefer `bun test` over `npm test`. Tests use Bun's native test runner (configured via `bunfig.toml`). `tsconfig.json` excludes `tests/` from compilation — type-check only runs over `src/`.

## Docker

```bash
# First-time setup
cp .env.example .env          # fill in ANTHROPIC_API_KEY and JWT_SECRET

# Build the image
docker compose build

# Run the CLI against the current project
docker compose run --rm vibemate --help
docker compose run --rm vibemate auto "build me a REST API"

# Run the MCP server (stdio transport — spawn via AI tool config)
docker compose run --rm vibemate-mcp

# Run tests inside the container
docker compose run --rm --entrypoint bun vibemate test
```

Build outputs: `dist/cli/index.js` (CLI) and `dist/mcp/index.js` (MCP server). Both are self-contained Bun bundles — no `node_modules` needed at runtime. The `.vibe/` directory is mounted as a named volume (`vibemate-state`) to persist SQLite state and learnings across container runs.

## Architecture

### Entry Points
- `src/cli/index.ts` — CLI entry (`vibemate` binary), registers all subcommands
- `src/mcp/index.ts` — MCP server entry (`vibemate-mcp` binary), exposes tools over stdio transport

### 13-Phase Autonomous Pipeline (`src/cli/auto.ts`)
The `vibemate auto "<description>"` command runs a state machine through:

**THINK → PLAN → DESIGN → BREAK → BUILD → CRITIQUE → HARNESS → REVIEW → QA → SHIP → RETRO → LEARN → DONE**

Each phase maps to a skill file in `skills/vibe-*.md`. Circuit breakers (budget, failure count, dispatch count) halt the pipeline. Current state persists to `.vibe/state.json`. The DESIGN phase is conditional (`has_ui` flag). Phase-to-model assignments are managed in `src/router/` by complexity tier.

### Commercial Modules (`src/`)
| Module | Role |
|--------|------|
| `mcp/` | MCP server, tool definitions (`spec`, `auto-complete`, `auto-fix`), auth, stack detection |
| `router/` | Cost-aware LLM routing across Anthropic/Google/OpenAI models by complexity tier |
| `context/` | Context engineering pipeline: AST extraction, LLMLingua compression, DLP masking, LRU cache |
| `compiler/` | Agent compilation for multi-platform output |
| `okf/` | OKF (Open Knowledge Format) bundle generator — markdown-with-frontmatter knowledge base |
| `telemetry/` | OpenTelemetry collector; all spans written to `.vibe/telemetry/` |
| `evolve/` | Self-improvement orchestrator (`SelfImprovementOrchestrator`) |
| `plugins/` | Plugin architecture for extending skills |
| `sdd/` | Spec-Driven Development: intent extraction, gap analysis, quality scoring |
| `learnings/` | Jules SDK integration — captures real-time LLM feedback for pattern recognition |
| `security/` | Vulnerability scanning, SBOM generation, auditing hooks into persistence |
| `prompts/` | `PromptRegistry` + `compose()` — merges role templates, system prompt, phase overrides into `.vibe/prompts/active.json` |

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
- **DLP pipeline** — `src/context/pipeline.ts` auto-masks secrets (AWS keys, JWTs, connection strings, env vars) before sending context to LLMs. All context passed to LLMs must flow through `ContextPipeline`.
- **Type system** — All shared types are in `src/types.ts`. Module-local types stay in the module.
- **Skills** — `skills/vibe-*.md` are the prompt files executed by each pipeline phase. `skills/learn-*` are self-improvement skill stubs.

## Patterns

### Error Hierarchy
All errors extend `VibemateError` (discriminated by `Symbol.for('vibemate-error')`). Use domain-specific subclasses and the type guard:

```typescript
// Throw
throw new DecisionError("COMPARISON_FAILED", "message", { context: {} });

// Catch
if (isVibemateError(error)) { error.code; error.context; }
```

Domain errors: `DiscoveryError`, `ScaffoldError`, `DecisionError`, `StateError`, `ExecutionError`, etc. (all in `src/shared/errors.ts`).

### Module Factory Pattern
Modules expose factory functions rather than global singletons. Higher-level factories take a `dbPath` and own the connection lifecycle; `createStore` takes an existing connection and delegates lifecycle to the caller:

```typescript
const engine = createDiscoveryEngine(dbPath);   // owns connection lifecycle
const dispatcher = createDispatcher(dbPath);     // owns connection lifecycle
const store = createStore(conn);                 // caller owns conn lifecycle
```

### Database Testing Lifecycle
Tests create isolated directories, run migrations, and tear down. Close the connection before removing the directory (required on Windows, good hygiene everywhere):

```typescript
const TEST_DB_DIR = path.join(process.cwd(), '.test-<module>');
let conn: DatabaseConnection;

beforeEach(() => {
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  conn = createConnection(path.join(TEST_DB_DIR, 'test.db'));
});

afterEach(() => {
  if (conn) closeConnection(conn);
  fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
});

// Inside test
runMigrations(conn);
const store = createStore(conn);
```

### Logging
Use `StructuredLogger` from `src/shared/logger.ts`. Log level is controlled by `VIBEMATE_LOG_LEVEL` env var (info/debug/warn/error).

### Property-Based Testing
Use `fast-check` for complex algorithm validation (scoring, requirements tracking). See `tests/shared/requirements-tracker.property.test.ts` for the pattern.

## Environment Variables
Key variables from `.env.example`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Yes | Primary LLM provider |
| `JWT_SECRET` | Yes | MCP server token signing |
| `OPENAI_API_KEY` | No | Optional routing target |
| `GOOGLE_API_KEY` | No | Optional routing target |
| `VIBEMATE_LOG_LEVEL` | No | info/debug/warn/error |
| `VIBEMATE_AGENT_TYPE` | No | claude-code \| cursor \| codex \| kilocode \| opencode |

Config is validated at startup via Zod schema in `src/shared/config-schema.ts`.

## Rules

1. **TDD:** Write a failing test first, then implement.
2. **OKF first:** Check the OKF bundle (`.vibe/`) for prior architectural decisions before implementing.
3. **Log learnings:** After completing tasks, log insights to the OKF bundle.
4. **Telemetry:** All actions emit spans to `.vibe/telemetry/` for retrospective analysis.
5. **DLP before LLM:** Any context sent to an LLM must pass through `ContextPipeline` — never send raw strings containing code or config directly.
