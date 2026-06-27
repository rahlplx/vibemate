# M001-CONTEXT.md

## Milestone M001 Context: MCP Foundation + Spec Generator

### Scope
Build the foundational MCP server infrastructure and the first skill: Spec Generator. This is the narrowest wedge that proves demand - if users install the MCP server and generate specs, the core value prop is validated.

### Goals
1. **MCP Server**: Running locally via `npx`, stdio transport, protocol compliant
2. **Spec Generator**: One tool (`vibemate_spec`) that takes an idea and returns a SPEC.md
3. **Installer**: One command (`npx vibemate install`) that configures any supported coding tool
4. **Auth**: OAuth flow to vibemate.dev for tier management

### Non-Goals (Explicit)
- Remote/hosted MCP server (SSE)
- Audit skill, Scaffold skill, Payments skill
- UI utilities library
- Telemetry dashboard, Evolve pipeline
- Registry/Marketplace, Web dashboard
- Team features, Billing
- Multi-LLM routing, Offline mode

### Technical Constraints
- **Runtime**: Bun primary, Node.js fallback
- **Language**: TypeScript strict mode
- **Testing**: Vitest, 90%+ coverage
- **Dependencies**: Apache 2.0 / MIT only
- **MCP SDK**: @modelcontextprotocol/sdk ^1.0
- **LLM**: Anthropic Claude 3.5 Sonnet via @anthropic-ai/sdk

### Key Interfaces

#### StackProfile (output of StackDetector)
```typescript
interface StackProfile {
  framework: 'nextjs' | 'express' | 'fastapi' | 'laravel' | 'generic';
  language: 'typescript' | 'javascript' | 'python' | 'php';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'composer';
  hasTypeScript: boolean;
  hasTailwind: boolean;
  hasDatabase: boolean;
  database?: 'postgres' | 'mysql' | 'sqlite' | 'mongodb';
  confidence: 'high' | 'medium' | 'low';
  rawMarkers: string[]; // files that triggered detection
}
```

#### SpecSchema (Zod + JSON Schema)
```typescript
// Core sections - each maps to SPEC.md section
interface SpecDoc {
  product: { name: string; oneLiner: string; problem: string; solution: string; };
  personas: Persona[];
  userFlows: UserFlow[];
  dataModel: { entities: Entity[]; relationships: Relationship[]; };
  apiContract: { style: 'rest' | 'trpc'; endpoints: Endpoint[]; };
  techStack: { layers: TechLayer[]; justification: string; };
  fileStructure: FileNode[];
  milestones: Milestone[];
  risks: Risk[];
}
```

#### MCP Tool: vibemate_spec
```typescript
// Input
{ idea: string; stack?: Partial<StackProfile>; }

// Output (text + structuredContent)
{
  content: [{ type: 'text'; text: string }]; // formatted SPEC.md
  structuredContent: SpecDoc; // for programmatic use
}
```

### Integration Points
1. **Anthropic API**: HTTPS, structured output via JSON Schema
2. **File System**: Read for stack detection, write for config injection
3. **Browser**: OAuth flow (open URL, receive token via callback)
4. **MCP Client**: stdio JSON-RPC 2.0

### Test Fixtures Needed
- `tests/fixtures/nextjs-project/` - package.json with next, tsconfig, tailwind
- `tests/fixtures/express-project/` - package.json with express, no tsconfig
- `tests/fixtures/fastapi-project/` - pyproject.toml with fastapi
- `tests/fixtures/laravel-project/` - composer.json with laravel
- `tests/fixtures/greenfield/` - empty directory

### Success Criteria
- User runs `npx vibemate install` → MCP configured in their tool
- User types "vibemate spec a todo app" → gets complete SPEC.md
- SPEC.md contains all 9 required sections
- Spec is tailored to detected stack (or generic if greenfield)