# T005: Unit Tests for Server Bootstrap

## Plan
Write comprehensive unit tests for MCP server startup, tool registration, and request handling.

## Files
- `tests/mcp/server.test.ts` - Server tests
- `tests/mcp/tools.test.ts` - Tool registration tests

## Test Cases

### Server Lifecycle
```typescript
describe('VibemateMcpServer', () => {
  let server: VibemateMcpServer;
  let mockTransport: MockTransport;

  beforeEach(() => {
    mockTransport = new MockTransport();
    server = new VibemateMcpServer({ logLevel: 'error', transport: mockTransport });
  });

  afterEach(async () => {
    await server.stop();
  });

  test('starts and connects to transport', async () => {
    await server.start();
    expect(mockTransport.connected).toBe(true);
  });

  test('stops gracefully', async () => {
    await server.start();
    await server.stop();
    expect(mockTransport.closed).toBe(true);
  });

  test('handles double start', async () => {
    await server.start();
    await expect(server.start()).rejects.toThrow('already started');
  });
});
```

### Tool Registration
```typescript
describe('Tool Registration', () => {
  test('registers vibemate_spec tool', async () => {
    await server.start();
    const tools = await server.listTools();
    const specTool = tools.find(t => t.name === 'vibemate_spec');
    expect(specTool).toBeDefined();
    expect(specTool.inputSchema.required).toContain('idea');
  });

  test('rejects duplicate tool names', async () => {
    await server.start();
    server.registerTool('test', def1, handler);
    expect(() => server.registerTool('test', def2, handler)).toThrow();
  });
});
```

### Request Handling
```typescript
describe('Request Handling', () => {
  test('handles initialize request', async () => {
    await server.start();
    const response = await mockTransport.sendRequest({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1.0' }}
    });
    expect(response.result.protocolVersion).toBe('2024-11-05');
    expect(response.result.capabilities.tools).toEqual({});
    expect(response.result.serverInfo.name).toBe('vibemate');
  });

  test('handles tools/list request', async () => {
    await server.start();
    const response = await mockTransport.sendRequest({
      jsonrpc: '2.0', id: 2, method: 'tools/list'
    });
    expect(response.result.tools).toHaveLength(1);
    expect(response.result.tools[0].name).toBe('vibemate_spec');
  });

  test('returns error for unknown tool', async () => {
    await server.start();
    const response = await mockTransport.sendRequest({
      jsonrpc: '2.0', id: 3, method: 'tools/call',
      params: { name: 'nonexistent', arguments: {} }
    });
    expect(response.error.code).toBe(-32601);
  });
});
```

### Logging Tests
```typescript
describe('Request Logging', () => {
  test('logs request and response with timing', async () => {
    const logs: LogEntry[] = [];
    server.setLogger({ log: (e) => logs.push(e) });
    await server.start();
    await mockTransport.sendRequest({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {...} });
    
    const reqLog = logs.find(l => l.message.startsWith('→ initialize'));
    const resLog = logs.find(l => l.message.startsWith('← initialize'));
    expect(reqLog).toBeDefined();
    expect(resLog).toBeDefined();
    expect(resLog.durationMs).toBeGreaterThan(0);
  });
});
```

## Must-Haves
- [ ] All tests pass
- [ ] Coverage >90% for server.ts
- [ ] No flaky tests
- [ ] Mock transport properly simulates stdio

## Verification
```bash
cd src/mcp && bun test tests/mcp/server.test.ts tests/mcp/tools.test.ts
```