# Vibemate — Agent Instructions

## Project Overview

Vibemate is an AI-native product platform with adaptive brainstorming, spec-driven planning, autonomous building, and self-improvement capabilities.

**Runtime:** Bun (primary), Node.js (fallback)
**Language:** TypeScript strict mode
**Tests:** `bun:test` — 831+ tests, 0 failures
**Database:** SQLite via better-sqlite3

## Architecture

### Module Layout

```
src/
├── shared/          # Error hierarchy, Zod schemas, config, failure classification
├── state/           # SQLite connection, migrations, CRUD store
├── security/        # Secret scanner, credential filter, redaction
├── learnings/       # Clone, instrument, extract, analyze, cognitive, patterns
├── discovery/       # Question bank, dynamic tree, ambiguity scoring
├── decision/        # Comparison matrix, scorer, benchmarks
├── scaffold/        # Templates, file writer, generator
├── execution/       # Complexity gate, task dispatcher
├── improve/         # Observation engine, insights
├── mcp/             # MCP server, tools, config, auth
├── server/          # HTTP API layer
├── cli/             # CLI commands (discover, scaffold, decide, learn, etc.)
├── sdd/             # Intent matching, governance, gap analysis
├── governance/      # Policy engine
├── context/         # Context engineering pipeline
├── okf/             # Knowledge management bundles
├── router/          # Cost-aware LLM routing
├── compiler/        # Agent compilation
├── performance/     # Caching, monitoring
├── telemetry/       # OpenTelemetry collector
├── evolve/          # Self-improvement
├── scaling/         # Worker pool, connection pool, auto-scaler
└── discovery/       # Skill discovery
```

## Test Commands

```bash
bun test                              # Run all tests
bun test tests/path/to/file.test.ts   # Run specific file
bun run typecheck                     # Type checking
```

## Code Conventions

1. **TDD is mandatory** — Write failing test first, then implement
2. **Strict TypeScript** — No `any` types. Use Zod at boundaries
3. **Immutability** — `readonly`, `as const`, spread over mutation
4. **Small pure functions** — Single responsibility, no side effects where possible
5. **Typed errors** — No generic `catch`. Use `FailureClassification` from `src/shared/failure-classification.ts`
6. **No comments** — Code is self-documenting
7. **Factory test data** — Use factory functions, not `let`/`beforeEach`

## Failure Classification Pattern

All failures should use the `AccessFailureClassification` pattern:

```typescript
import { classifyFailure } from "../shared/failure-classification"

const classification = classifyFailure(error)
// Returns: { kind, reason, nextStep, confidence }
```

Kinds: `auth`, `network`, `tool`, `permission`, `validation`, `rate-limit`, `timeout`, `not-found`, `unknown`

## Security Module

```typescript
import { scanForSecrets, sanitizeConfig, redactForLog } from "../security"

// Scan text for secrets
const findings = scanForSecrets(fileContent, { redact: true })

// Sanitize config objects
const safeConfig = sanitizeConfig(rawConfig)

// Redact for logging
console.log(redactForLog(sensitiveObject))
```

## Config Schema

```typescript
import { generateJsonSchema, getFieldHints, ConfigBackupManager } from "../shared/config-schema"

// Generate JSON Schema for validation
const schema = generateJsonSchema()

// Get UI hints for config form rendering
const hints = getFieldHints()

// Backup with rotation
const mgr = new ConfigBackupManager(".vibe/backups", 5)
mgr.createBackup(config)
```

## Cognitive Engine (Learnings)

```typescript
import { 
  maturityAssessment, 
  adaptiveThreshold, 
  ensembleVoting,
  createMemoryEntry,
  computeMemoryStrength,
  prioritizeByDifficulty,
} from "../learnings/cognitive"

// Assess maturity of analyzed code
const maturity = maturityAssessment(metrics) // "prototype" | "developing" | "mature" | "enterprise"

// Adaptive threshold based on maturity
const threshold = adaptiveThreshold(maturity, "anti-patterns")

// Ensemble voting across detectors
const ensemble = ensembleVoting(findings) // { confirmed, voters, threshold }

// Ebbinghaus memory decay for knowledge retention
const memory = createMemoryEntry("learning", "value", ["tags"])
const strength = computeMemoryStrength(memory)
```

## CLI Commands

```bash
vibemate learn run <repo-url>   # Clone, analyze, extract patterns
vibemate learn audit -d <dir>   # Audit existing codebase
```

## Dependencies

- `zod` — Schema validation
- `better-sqlite3` — SQLite (requires build tools)
- `@opencode-ai/opencode` — OpenCode integration
- `effect` — Effect-based error handling

## Common Pitfalls

1. **better-sqlite3** requires Visual Studio Build Tools on Windows
2. **bun test** doesn't respect `.bunignore` — move cloned repos outside project root
3. **Windows** rejects filenames with `:`
4. **PowerShell** doesn't support `rm -rf` — use `Remove-Item -Recurse -Force`
5. **Regex `g` flag** persists `lastIndex` — use `new RegExp()` per call
