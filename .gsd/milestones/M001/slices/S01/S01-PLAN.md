# S01-PLAN.md

## Slice S01: MCP Server Setup

**Goal**: Working MCP server that starts via `npx vibemate-mcp`, implements stdio transport, and responds to initialize/tools/list.

**Risk**: Low
**Dependencies**: None
**Est. Days**: 2

### Task Breakdown

| Task | Name | Files | Must-Haves | Verify |
|------|------|-------|------------|--------|
| T001 | Initialize Bun/TypeScript project with MCP SDK | package.json, tsconfig.json, src/mcp/server.ts | Bun project, @modelcontextprotocol/sdk ^1.0, TypeScript strict | `bun install` succeeds, `tsc --noEmit` passes |
| T002 | Implement stdio transport server | src/mcp/server.ts, src/mcp/transport.ts | Server class with start()/stop(), stdio transport, JSON-RPC 2.0 | Server starts, reads stdin, writes stdout |
| T003 | Register vibemate_spec tool | src/mcp/server.ts, src/mcp/tools/spec.ts | Tool definition with name, description, inputSchema | tools/list returns vibemate_spec |
| T004 | Add request/response logging | src/mcp/logging.ts | Log level config, structured logs for each request | Logs show initialize → tools/list → tools/call |
| T005 | Unit tests for server bootstrap | tests/mcp/server.test.ts | Test: server starts, handles initialize, lists tools | All tests pass, coverage >90% |

### Technical Details

#### Project Structure (new files)
```
src/
└── mcp/
    ├── server.ts          # Main server class
    ├── transport.ts       # Stdio transport wrapper
    ├── tools/
    │   └── spec.ts        # vibemate_spec tool definition
    ├── logging.ts         # Structured logging
    └── index.ts           # Exports
```

#### package.json additions
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.14.0"
  },
  "scripts": {
    "mcp:dev": "bun --watch src/mcp/server.ts",
    "test:mcp": "vitest run tests/mcp"
  }
}
```

#### Server Class Interface
```typescript
class McpServer {
  constructor(private config: ServerConfig);
  async start(): Promise<void>;
  async stop(): Promise<void>;
  registerTool(name: string, definition: ToolDefinition, handler: ToolHandler): void;
}
```

#### Tool Definition (vibemate_spec)
```typescript
const specTool = {
  name: 'vibemate_spec',
  description: 'Generate a complete product specification from a plain English idea',
  inputSchema: {
    type: 'object',
    properties: {
      idea: { type: 'string', description: 'Plain English product description' },
      stack: { type: 'object', description: 'Optional stack override', properties: {} }
    },
    required: ['idea']
  }
};
```

### Verification Script
```bash
# 1. Start server
npx vibemate-mcp &
SERVER_PID=$!

# 2. Send initialize request
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | nc -U /tmp/mcp.sock

# 3. Send tools/list
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | nc -U /tmp/mcp.sock

# 4. Verify vibemate_spec in response
# 5. Kill server
kill $SERVER_PID
```