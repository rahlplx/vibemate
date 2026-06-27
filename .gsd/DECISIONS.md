# DECISIONS.md

## Architectural Decisions

### ADR-001: MCP Transport - stdio over SSE
**Date**: 2026-06-27
**Status**: Accepted
**Context**: MCP supports stdio (local) and SSE (remote) transports.
**Decision**: Use stdio for Phase 1. SSE for future remote/hosted offering.
**Rationale**: 
- Simpler deployment (no server infrastructure)
- Works with all coding tools out of the box
- Lower latency for local development
- Token stays on user's machine
**Consequences**: Cannot share server across team; each user runs own instance.

### ADR-002: LLM Provider - Anthropic Claude Only (Phase 1)
**Date**: 2026-06-27
**Status**: Accepted
**Context**: Need structured output for SPEC.md generation.
**Decision**: Use Anthropic Claude API exclusively for Phase 1.
**Rationale**:
- Best-in-class structured output via JSON schema
- Strong reasoning for architecture decisions
- Lower hallucination rate on technical specs
- Cost: ~$0.05 per spec generation
**Consequences**: Vendor lock-in for Phase 1. Router abstraction added for Phase 2.

### ADR-003: Stack Detection - File System Scanning
**Date**: 2026-06-27
**Status**: Accepted
**Context**: Need to tailor spec to user's tech stack.
**Decision**: Scan project root for package.json, tsconfig.json, framework markers.
**Rationale**:
- No user configuration required
- Works for existing projects and greenfield (detects nothing → generic)
- Extensible: add more markers over time
**Consequences**: Monorepos need special handling (detect per-package).

### ADR-004: Config Injection - Platform-Specific Files
**Date**: 2026-06-27
**Status**: Accepted
**Context**: Each coding tool stores MCP config differently.
**Decision**: Write to platform-specific files: .mcp.json (Claude), .cursor/mcp.json (Cursor), etc.
**Rationale**:
- Native integration, no user manual steps
- Each platform reads its own format
- Append-only: preserve existing servers
**Consequences**: Must maintain platform config schemas.

### ADR-005: Auth - OAuth via vibemate.dev
**Date**: 2026-06-27
**Status**: Accepted
**Context**: Need to identify users for tier enforcement (Free vs Pro).
**Decision**: OAuth flow to vibemate.dev, token stored in MCP config env var.
**Rationale**:
- Centralized user management
- Token can be revoked
- Tier check on each skill call
**Consequences**: Requires internet for auth. Offline mode not supported in Phase 1.

### ADR-006: Spec Output - Markdown + Structured Data
**Date**: 2026-06-27
**Status**: Accepted
**Context**: Users need readable SPEC.md file, but tools may want structured data.
**Decision**: Return both: formatted Markdown as text, structured JSON as structuredContent.
**Rationale**:
- Human reads Markdown in coding tool
- Future skills can parse structured data
- Single source of truth
**Consequences**: Must keep both in sync via single generation.

### ADR-007: Error Handling - Retry with Feedback
**Date**: 2026-06-27
**Status**: Accepted
**Context**: LLM may return invalid JSON or incomplete spec.
**Decision**: Validate against Zod schema. On failure, re-prompt with error details (max 2 retries).
**Rationale**:
- Self-correcting without human intervention
- Structured feedback improves LLM compliance
- Fallback to template on total failure
**Consequences**: Adds latency (~5-10s per retry). Acceptable for quality.

### ADR-008: Testing - Vitest with MCP SDK Test Harness
**Date**: 2026-06-27
**Status**: Accepted
**Context**: Need to test MCP protocol compliance and skill logic.
**Decision**: Use Vitest. Mock Anthropic SDK. Use MCP SDK's in-memory transport for integration tests.
**Rationale**:
- Fast, deterministic tests
- No real API calls in CI
- Tests protocol compliance
**Consequences**: Need to maintain mock responses as schema evolves.

### ADR-009: Dependencies - Apache 2.0 / MIT Only
**Date**: 2026-06-27
**Status**: Accepted
**Context**: Commercial product with open core.
**Decision**: Only Apache 2.0 or MIT licensed dependencies in core.
**Rationale**:
- No copyleft contamination
- Safe for commercial distribution
- Aligns with SPEC.md license strategy
**Consequences**: Excludes AGPL/GPL deps (e.g., Smithery CLI).

### ADR-010: Spec Schema - Zod for Validation + JSON Schema for LLM
**Date**: 2026-06-27
**Status**: Accepted
**Context**: Need runtime validation and LLM-structured output.
**Decision**: Define Zod schema as source of truth. Export JSON Schema for LLM prompt.
**Rationale**:
- Single source of truth
- Zod for TypeScript types + runtime validation
- JSON Schema for Anthropic structured output
**Consequences**: Must keep Zod ↔ JSON Schema in sync (auto-generate).