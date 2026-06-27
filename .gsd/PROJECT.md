# PROJECT.md

## Project: Vibemate MCP Server Foundation with Spec Generator

### Vision
Build an MCP server that plugs into any AI coding tool (Claude Code, Cursor, Codex, etc.) and gives vibe coders enterprise-grade spec generation from plain English ideas.

### Core Value Proposition
**One thing it MUST do:** Generate a complete, production-ready product specification and architecture from a plain English idea - including tech stack recommendation with justification, data model, API contracts, folder structure, milestone breakdown, and enterprise risk flags - all tailored to their detected stack, delivered instantly inside their AI coding tool via MCP.

### Target Users
1. **Solo Founder** - Non-technical, first SaaS with AI. Ships fast but misses auth hardening, payment webhooks, error monitoring.
2. **AI-First Developer** - Technical, uses AI for speed. AI generates working code but not production patterns.
3. **Early Startup Team** - 2-5 people, no senior engineers. Moving fast, no one to review for security/scalability/reliability.

### Success Metrics (3 months)
- MCP Installs: 500
- Daily Active Users: 50
- Spec Generations: 200
- Supported Platforms: 5
- Pro Conversions: 5%

### Scope (Phase 1 - Weeks 1-3)
1. MCP TypeScript Server (stdio transport)
2. Spec Generator Skill (FREE tier)
3. CLI Installer (`npx vibemate install`)

### Out of Scope (Explicit)
- Audit skill, Scaffold skill, Payments skill, UI utilities
- Telemetry dashboard, Evolve pipeline, Registry/Marketplace
- Web dashboard, Team features, Billing, License enforcement
- SSE/remote transport, Multi-LLM routing, Offline/local LLM