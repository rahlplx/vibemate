# Vibemate

Zero-config, AI coding agent agnostic unified plugin platform. Works with Claude Code, OpenCode, Cursor, and Codex.

## Features

- **OKF Bundle**: Vendor-neutral knowledge format (OKF v0.1) with 6 pre-populated architectural decisions
- **MCP Auto-Config**: 8 pinned MCP servers (Context7, GitHub, Playwright, etc.) + 2 Vibemate-specific servers
- **Context Engineering**: AST extraction, LLMLingua compression, DLP sanitization
- **Telemetry**: OpenTelemetry + ATSC semantic conventions with stuck detection
- **Self-Improvement**: RetroAgent, EvolveAgent, LearnAgent with weekly evolution cadence
- **Cost-Aware Router**: 8 model configs (Haiku, Sonnet, Opus, Flash, Pro, GPT-4o-mini, GPT-4o, o3-mini)

## Quick Start

```bash
# Initialize Vibemate in your project
npx vibemate init

# Compile artifacts for your AI agent
npx vibemate sync

# Run autonomous mode
npx vibemate auto "Build me a feature"

# Check status
npx vibemate status
```

## Commands

| Command | Description |
|---------|-------------|
| `vibemate init` | Bootstrap project with OKF, MCP, telemetry |
| `vibemate sync` | Compile artifacts for detected AI agent |
| `vibemate auto` | Autonomous pipeline with circuit breakers |
| `vibemate telemetry` | View/export/clear telemetry data |
| `vibemate evolve` | Trigger self-improvement cycle |
| `vibemate status` | Show project status |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Vibemate CLI                           │
├─────────────────────────────────────────────────────────────┤
│  init  │  sync  │  auto  │  telemetry  │  evolve  │ status │
├─────────────────────────────────────────────────────────────┤
│                    Core Modules                              │
├─────────┬─────────┬─────────┬─────────┬─────────┬──────────┤
│   OKF   │   MCP   │ Context │Telemetry│ Evolve  │  Router  │
│Generator│ Config  │ Pipeline│Collector│  Agents │  (LLM)   │
├─────────┴─────────┴─────────┴─────────┴─────────┴──────────┤
│              Compiler (Claude/OpenCode/Cursor/Codex)        │
└─────────────────────────────────────────────────────────────┘
```

## Supported Agents

- **Claude Code**: `.claude/skills/`, `CLAUDE.md`, `.claude-plugin/plugin.json`
- **OpenCode**: `opencode.json`
- **Cursor**: `.cursor/rules/`, `.cursorrules`
- **Codex**: `AGENTS.md`

## License

MIT
