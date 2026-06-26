# Vibemate

**Ship like an enterprise team. Build like a vibe coder.**

Vibemate is an AI-native product platform that gives solo founders and small teams the same enterprise-grade patterns, guardrails, and knowledge that 50-person engineering teams have.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-266%20passing-brightgreen)](#test-results)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](#tech-stack)

## What is Vibemate?

Vibemate is a universal toolkit that helps vibe coders — people building products with AI coding assistants — ship production-quality code with enterprise patterns.

### Three Ways to Use Vibemate

```
┌─────────────────────────────────────────────────────────────────┐
│                     THE 3 WAYS TO USE VIBEMATE                  │
│                                                                 │
│  1. INSIDE YOUR AI CODING TOOL (MCP)                            │
│     You type: "vibemate add kanban"                             │
│     Vibemate generates + installs enterprise code for you       │
│                                                                 │
│  2. COMMAND LINE (CLI)                                          │
│     npx vibemate-ui add kanban                                  │
│     Installs from your terminal directly                        │
│                                                                 │
│  3. WEB APP (vibemate.dev)                                      │
│     Browse, preview, manage everything visually                 │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Core Platform (Open Source)

| Feature | Description | Status |
|---------|-------------|--------|
| **Discovery Engine** | Adaptive brainstorming with unlimited questions until zero ambiguity | ✅ Complete |
| **Decision Engine** | Technology comparison with weighted scoring and benchmark data | ✅ Complete |
| **Scaffold Generator** | Project scaffolding with templates for SaaS, API, CLI | ✅ Complete |
| **Execution Gate** | Complexity-based routing (inline/session/subagent) | ✅ Complete |
| **Self-Improvement** | Observation engine with insights by confidence threshold | ✅ Complete |
| **State Management** | SQLite local-first with pluggable cloud sync | ✅ Complete |

### Enterprise Features (Commercial)

| Feature | Description | Status |
|---------|-------------|--------|
| **MCP Server** | Model Context Protocol integration | ✅ Complete |
| **Skills Engine** | Curated enterprise patterns | ✅ Complete |
| **OKF Bundle** | Knowledge management system | ✅ Complete |
| **Telemetry** | OpenTelemetry integration | ✅ Complete |
| **Cost-Aware Router** | LLM cost optimization | ✅ Complete |
| **13-Phase Pipeline** | Autonomous build with circuit breakers | ✅ Complete |

## Quick Start

### Installation

```bash
# Install Vibemate
npm install -g @vibemate/core

# Or use npx
npx vibemate init
```

### CLI Commands

```bash
# Start discovery session (adaptive brainstorming)
vibemate discover

# Compare technology options
vibemate decide

# Generate project scaffolding
vibemate scaffold

# Run autonomous pipeline
vibemate auto "Build me a SaaS app"

# Check project status
vibemate status
```

### MCP Integration

```bash
# Install Vibemate MCP server
npx vibemate install

# Add to Claude Code
# → Adds entry to .mcp.json automatically

# Add to Cursor
# → Adds entry to .cursor/mcp.json automatically
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Vibemate Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Discovery   │  │  Decision   │  │  Scaffold   │            │
│  │   Engine     │  │   Engine    │  │  Generator  │            │
│  │             │  │             │  │             │            │
│  │ Questions   │  │ Matrix      │  │ Templates   │            │
│  │ Tree        │  │ Scorer      │  │ File Writer │            │
│  │ Scoring     │  │ Data        │  │ Generator   │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Execution   │  │   Improve   │  │   State     │            │
│  │    Gate      │  │  Engine     │  │  Management │            │
│  │             │  │             │  │             │            │
│  │ Complexity  │  │ Observations│  │ SQLite      │            │
│  │ Dispatcher  │  │ Insights    │  │ Migrations  │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                    Enterprise Layer (Commercial)                │
├─────────┬─────────┬─────────┬─────────┬─────────┬──────────────┤
│   OKF   │   MCP   │ Context │Telemetry│ Evolve  │    Router    │
│Generator│ Config  │ Pipeline│Collector│  Agents │  (LLM Cost)  │
└─────────┴─────────┴─────────┴─────────┴─────────┴──────────────┘
```

## Test Results

```
Test Files  29 passed (29)
     Tests  266 passed (266)
  Duration  3.00s
```

### Test Coverage

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

## Tech Stack

- **Runtime:** Bun primary, Node.js fallback
- **Database:** SQLite via better-sqlite3
- **Testing:** vitest 3.2.6
- **TypeScript:** strict mode
- **CLI:** commander.js
- **Validation:** Zod schemas

## Supported AI Agents

- **Claude Code**: `.claude/skills/`, `CLAUDE.md`, `.claude-plugin/plugin.json`
- **OpenCode**: `opencode.json`
- **Cursor**: `.cursor/rules/`, `.cursorrules`
- **Codex**: `AGENTS.md`

## Open Source Strategy

### What's Free (Open Source)

- CLI commands (discover, scaffold, decide)
- Discovery engine
- Decision engine
- Scaffold generator
- Execution gate
- Self-improvement engine
- State management
- Full documentation

### What's Commercial

- MCP server
- Skills engine
- OKF bundle generator
- Telemetry integration
- Cost-aware router
- 13-phase autonomous pipeline
- Enterprise support

## Documentation

- **[SPEC.md](./SPEC.md)** — Product specification
- **[LEARNING.md](./LEARNING.md)** — Screen-by-screen guide
- **[CLAUDE.md](./CLAUDE.md)** — Developer context

## Contributing

We welcome contributions! Please see our contributing guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Support

- **Documentation**: vibemate.dev/docs
- **Issues**: GitHub Issues
- **Discord**: vibemate.dev/discord
