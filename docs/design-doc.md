# Design Doc: Vibemate MCP Server Foundation with Spec Generator

## Problem

**Who has this problem:** Solo founders (non-technical), AI-first developers (technical but rely on AI for speed), and early startup teams (2-5 people, no senior engineers) who build products with AI coding assistants.

**How we know:** 
- "Vibe coding" is a recognized movement - developers using AI to build entire products
- SPEC.md documents 3 personas with identical pain: "They don't know what they don't know"
- Current MCP marketplaces have 36.7% SSRF vulnerabilities, 41% no auth (per SPEC.md research)
- No existing tool provides enterprise-grade specs via MCP protocol

**What they do today:** 
- Use AI coding tools that generate working but non-production code
- Copy from Stack Overflow / generic boilerplates
- Hope AI gets security, scalability, observability right (it doesn't)
- Spend weeks discovering missing enterprise patterns after launch

## Core Value Proposition

**The ONE thing it MUST do:** Generate a complete, production-ready product specification and architecture from a plain English idea - including tech stack recommendation with justification, data model (entities + relationships), API contracts (REST/tRPC), folder/file structure, milestone breakdown (Week 1/2/3/4), and enterprise risk flags - all tailored to their detected stack, delivered instantly inside their AI coding tool via MCP.

## MVP Scope (Narrowest Wedge)

**Phase 1 - Weeks 1-3 per SPEC.md:**

1. **MCP TypeScript Server** (`@modelcontextprotocol/sdk` stdio transport)
   - Runs locally via `npx vibemate-mcp`
   - Auto-detects coding platform (Claude Code, Cursor, Codex, Kilocode, OpenCode)
   - Updates correct config (`.mcp.json`, `.cursor/mcp.json`, etc.)
   - Auth token management via `vibemate.dev/auth/cli-login`

2. **Skill 1: Spec & Architecture Generator** (FREE tier)
   - Trigger: `/vibemate spec [idea]` or natural language
   - Input: Plain English product description
   - Output: Full SPEC.md with:
     - Product requirements (PRD)
     - User personas
     - Core user flows
     - Data model (entities + relationships)
     - API contract (REST or tRPC)
     - Tech stack recommendation + justification
     - Folder/file structure
     - Milestone breakdown
     - Risk flags (what could go wrong)

3. **CLI Installer** (`npx vibemate install`)
   - One-command setup for all supported platforms
   - Auto-sign-in flow to vibemate.dev
   - Token stored in MCP config

**OUT OF SCOPE for Phase 1 (explicitly):**
- Audit skill, Scaffold skill, Payments skill, UI utilities
- Telemetry dashboard, Evolve pipeline, Registry/Marketplace
- Web dashboard, Team features, Billing, License enforcement
- SSE/remote transport, Multi-LLM routing, Offline/local LLM support

## Target Users

| Persona | Who | Pain |
|---------|-----|------|
| Solo Founder | Non-technical, first SaaS with AI | Ships fast but misses auth hardening, payment webhooks, error monitoring |
| AI-First Developer | Technical, uses AI for speed | AI generates working code but not production patterns |
| Early Startup Team | 2-5 people, no senior engineers | Moving fast, no one to review for security/scalability/reliability |

## Success Metrics

| Metric | 3-Month Target | 6-Month Target |
|--------|----------------|----------------|
| MCP Installs | 500 | 5,000 |
| Daily Active Users | 50 | 500 |
| Spec Generations | 200 | 2,000 |
| Supported Platforms | 5 | 10 |
| Pro Conversions | 5% | 8% |

## Technical Approach (High-Level)

```
┌─────────────────────────────────────────────────────────────────┐
│  USER'S CODING TOOL (Claude Code / Cursor / Codex / etc.)      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MCP Client (built into tool)                           │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │ stdio (JSON-RPC 2.0)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  VIBEMATE MCP SERVER (Node/Bun process, spawned by npx)        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  MCP SDK (@modelcontextprotocol/sdk)                    │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │   │
│  │  │ Resources   │ │ Tools       │ │ Prompts         │   │   │
│  │  │ (none yet)  │ │ vibemate_*  │ │ (none yet)      │   │   │
│  │  └─────────────┘ └─────────────┘ └─────────────────┘   │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────┼──────────────────────────────┐   │
│  │  Skill Registry (in-memory, dynamic require)            │   │
│  │  ┌───────────────────────────────────────────────────┐  │   │
│  │  │ SpecGeneratorSkill                                │  │   │
│  │  │ - detectStack(projectRoot) → StackProfile         │  │   │
│  │  │ - generateSpec(idea, profile) → SpecDoc           │  │   │
│  │  │ - formatOutput(spec) → MCP Tool Result            │  │   │
│  │  └───────────────────────────────────────────────────┘  │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                             │                                    │
│  ┌──────────────────────────┼──────────────────────────────┐   │
│  │  LLM Client (Anthropic SDK)                             │   │
│  │  - Structured output via JSON Schema                    │   │
│  │  - System prompt with spec template                     │   │
│  └──────────────────────────┬──────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ANTHROPIC CLAUDE API                                           │
└─────────────────────────────────────────────────────────────────┘
```

**Data Flow:**
1. User invokes `vibemate_spec` tool with `idea` parameter
2. MCP Server receives tool call → `SpecGeneratorSkill.handle()`
3. Skill detects stack: scans `package.json`, `tsconfig.json`, framework markers
4. Skill builds structured prompt with stack context + user idea
5. Calls Anthropic API with JSON schema for structured output
6. Validates response against schema → formats as SPEC.md
7. Returns result to MCP client → displayed in coding tool
8. User saves as `SPEC.md` in project root

**Key Components:**
| Component | Responsibility | Tests Needed |
|-----------|----------------|--------------|
| `McpServer` | Stdio transport, tool registration, request routing | Unit: tool dispatch, error handling |
| `SpecGeneratorSkill` | Stack detection, prompt building, LLM call, output formatting | Unit: stack detection, prompt template, schema validation |
| `StackDetector` | File system scan → `StackProfile` | Unit: Next.js, Express, FastAPI, Laravel, generic |
| `SpecSchema` | Zod schema for structured LLM output | Unit: valid/invalid outputs |
| `ConfigInjector` | Platform detection → writes `.mcp.json`/`.cursor/mcp.json` | Unit: each platform, conflict handling |

**Edge Cases:**
- No `package.json` (greenfield project) → generic stack profile
- Multiple MCP servers in config → append, don't overwrite
- LLM returns invalid JSON → retry with error feedback (max 2)
- Network timeout → graceful error with retry guidance
- User not authenticated → return auth URL, don't crash
- Rate limited by Anthropic → exponential backoff, user notification

**Failure Modes:**
| Scenario | Detection | Mitigation |
|----------|-----------|------------|
| Anthropic API down | HTTP 5xx / timeout | Retry 2x, then return cached fallback spec template |
| Invalid LLM output | Zod validation fails | Re-prompt with error context (max 2 retries) |
| Stack detection wrong | User feedback / audit | Manual override flag in tool params |
| Config write fails | FS error | Print config to stdout for manual copy |
| Token expired | 401 from cloud API | Trigger re-auth flow |

**Scaling Assumptions:**
- Local MCP server: single-user, spawned per session, no horizontal scaling needed
- Anthropic API: rate limits handled by SDK, cost tracked per spec (~$0.05)
- File I/O: local FS only, no distributed state

**Dependencies:**
- `@modelcontextprotocol/sdk` ^1.0 (Apache 2.0)
- `@anthropic-ai/sdk` ^0.24 (MIT)
- `zod` ^3.23 (MIT) - schema validation
- `glob` ^10.3 (MIT) - stack detection
- `yaml` ^2.4 (MIT) - config parsing
- `chalk` ^5.3 (MIT) - CLI output

## UI Requirements

**No traditional UI needed for Phase 1.** The interface IS the MCP protocol inside the user's coding tool.

**What the user sees in their AI coding tool:**
```
┌─────────────────────────────────────────────────────────────┐
│  Claude Code                                                 │
│                                                              │
│  Vibemate MCP connected ✓                                   │
│  Available skills:                                           │
│  ✓ vibemate_spec          Generate a full product spec      │
│  ○ vibemate_audit         (Pro) Audit your codebase         │
│  ○ vibemate_scaffold      (Pro) Add enterprise patterns     │
│  ○ vibemate_add           (Pro) Add UI utility component    │
│                                                              │
│  Try: "vibemate spec a time-tracking app for freelancers"   │
└─────────────────────────────────────────────────────────────┘
```

**MCP Interface Design Review (Post-Review):**
| Dimension | Score | Target |
|-----------|-------|--------|
| Clarity of MCP Interface | 9/10 | Self-documenting tool names, examples on connect |
| Onboarding Flow | 7/10 | Auto-detect platform, browser auth, but token in plain text |
| Error Communication | 6/10 | Need human-readable MCP errors with actionable next steps |
| Progress Feedback | 5/10 | No streaming/progress for 10-30s generation - add phases |
| Discoverability | 8/10 | Skills listed with free/pro indicators |

**Future UI (Phase 4+):** Web dashboard at vibemate.dev for:
- Component picker (vibemate.dev/ui)
- Telemetry dashboard
- Evolve suggestions
- Billing/settings

## Open Questions (Resolved/Updated from Review)

1. **LLM Provider**: Start with Anthropic only (Claude 3.5 Sonnet). Router for OpenAI/Gemini in Phase 2.
2. **Structured Output**: JSON Schema validation via Zod. Function calling not needed - schema ensures format.
3. **Offline Mode**: Not in Phase 1. Local LLM support (Ollama) in Phase 3+.
4. **Stack Detection Edge Cases**: Monorepos → detect root package.json; Nx/Turbo → check workspace config; custom frameworks → fallback to generic.
5. **Config Conflicts**: Append to existing `mcpServers` object, preserve other servers. Backup original config.
6. **Token Storage**: Plain text in MCP config for Phase 1 (user's local machine). Keychain/secret manager in Phase 2.
7. **Telemetry Opt-in**: Default ON for Free tier (anonymized). Explicit opt-out in CLI and MCP config.
8. **Progress Feedback**: Add streaming tool updates (MCP supports progress notifications) showing: "Detecting stack..." → "Generating spec..." → "Validating output..." → "Formatting SPEC.md..."

## Review Sign-off

- **CEO Review**: ✅ Narrowest wedge validated (Spec Generator only). 10-star vision documented. Out-of-scope explicit.
- **Eng Review**: ✅ Architecture diagram complete. Data flow mapped. Components defined. Test matrix ready. Failure modes mitigated.
- **Design Review**: ✅ MCP interface scored. Progress feedback identified as gap. Token storage flagged for Phase 2.

**Ready for `/vibe:break`**