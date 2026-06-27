# T002: Implement Stdio Transport Server

## Plan
Implement the MCP server class with stdio transport, handling JSON-RPC 2.0 messages.

## Files
- `src/mcp/server.ts` - Main server class
- `src/mcp/transport.ts` - Stdio transport wrapper

## Server Class Interface
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export class VibemateMcpServer {
  private server: Server;
  private transport: StdioServerTransport;
  private logger: Logger;

  constructor(config: ServerConfig) {
    this.server = new Server(
      { name: 'vibemate', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );
    this.transport = new StdioServerTransport();
    this.logger = createLogger(config.logLevel);
  }

  async start(): Promise<void> {
    this.setupRequestLogging();
    await this.server.connect(this.transport);
    this.logger.info('MCP server started on stdio');
  }

  async stop(): Promise<void> {
    await this.server.close();
    this.logger.info('MCP server stopped');
  }

  registerTool(name: string, definition: ToolDefinition, handler: ToolHandler): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: Array.from(this.tools.values()).map(t => t.definition)
    }));
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const tool = this.tools.get(request.params.name);
      if (!tool) throw new Error(`Tool not found: ${request.params.name}`);
      return tool.handler(request.params.arguments);
    });
    this.tools.set(name, { definition, handler });
  }

  private setupRequestLogging(): void {
    // Log all incoming requests
  }
}
```

## Must-Haves
- [ ] Server starts and connects to stdio transport
- [ ] Handles `initialize` request (returns protocol version, capabilities, serverInfo)
- [ ] Handles `tools/list` request (returns registered tools)
- [ ] Handles `tools/call` request (routes to registered handler)
- [ ] Returns proper JSON-RPC error responses for invalid requests
- [ ] Graceful shutdown on SIGTERM/SIGINT

## Verification
```bash
# Test initialize
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js

# Test tools/list
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' | node dist/index.js
```