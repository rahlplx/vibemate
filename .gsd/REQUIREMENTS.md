# REQUIREMENTS.md

## Capability Contract: Vibemate MCP Server Foundation

### Must-Have Capabilities (MVP)

#### 1. MCP Server Runtime
- **REQ-001**: Server starts via `npx vibemate-mcp` and communicates over stdio using JSON-RPC 2.0
- **REQ-002**: Implements MCP protocol: initialize, tools/list, tools/call
- **REQ-003**: Registers `vibemate_spec` tool with proper schema
- **REQ-004**: Graceful shutdown on stdin close

#### 2. Spec Generator Skill
- **REQ-005**: Tool accepts `idea` (string, required) and `stack` (object, optional override) parameters
- **REQ-006**: Detects project stack by scanning: package.json, tsconfig.json, framework markers
- **REQ-007**: Supports stack profiles: Next.js, Express, FastAPI, Laravel, Generic
- **REQ-008**: Calls Anthropic Claude API with structured output (JSON schema)
- **REQ-009**: Validates LLM response against Zod schema for SPEC.md structure
- **REQ-010**: Returns formatted SPEC.md as tool result (text + structured data)
- **REQ-011**: Retries up to 2 times on invalid LLM output with error feedback
- **REQ-012**: Falls back to template-based spec on API failure

#### 3. SPEC.md Output Structure
- **REQ-013**: Product requirements (PRD) with problem, solution, success metrics
- **REQ-014**: User personas (primary + secondary)
- **REQ-015**: Core user flows (3-5 numbered flows)
- **REQ-016**: Data model (entities + relationships, Mermaid-compatible)
- **REQ-017**: API contract (REST or tRPC, with endpoints, schemas)
- **REQ-018**: Tech stack recommendation with justification per layer
- **REQ-019**: Folder/file structure (tree format)
- **REQ-020**: Milestone breakdown (Week 1/2/3/4 with deliverables)
- **REQ-021**: Enterprise risk flags (security, scaling, compliance)

#### 4. CLI Installer
- **REQ-022**: `npx vibemate install` detects coding platform (Claude Code, Cursor, Codex, Kilocode, OpenCode)
- **REQ-023**: Writes platform-specific config: .mcp.json, .cursor/mcp.json, etc.
- **REQ-024**: Opens browser to vibemate.dev/auth/cli-login for OAuth
- **REQ-025**: Stores token in MCP config env var (VIBEMATE_TOKEN)
- **REQ-026**: Handles multiple platforms in one run
- **REQ-027**: Idempotent: re-running doesn't duplicate entries

#### 5. Error Handling & UX
- **REQ-028**: Human-readable error messages with actionable next steps
- **REQ-029**: Progress indication for spec generation (phases: detecting stack, calling API, formatting)
- **REQ-030**: Auth expiration detection with re-auth guidance
- **REQ-031**: Rate limit handling with exponential backoff

### Should-Have Capabilities
- **REQ-032**: Stack detection confidence score (high/medium/low)
- **REQ-033**: Manual stack override via tool parameter
- **REQ-034**: Config conflict detection (multiple MCP servers)
- **REQ-035**: Spec generation timing metrics

### Could-Have Capabilities
- **REQ-036**: Streaming progress via MCP notifications
- **REQ-037**: Local LLM fallback (Ollama)

### Non-Functional Requirements
- **NFR-001**: Spec generation completes in <30 seconds (p95)
- **NFR-002**: Server startup <2 seconds
- **NFR-003**: Zero-downtime config updates
- **NFR-004**: TypeScript strict mode, zero `any` types
- **NFR-005**: 90%+ test coverage on core logic
- **NFR-006**: Apache 2.0 / MIT licensed dependencies only