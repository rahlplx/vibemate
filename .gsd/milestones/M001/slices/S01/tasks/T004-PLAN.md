# T004: Add Request/Response Logging

## Plan
Implement structured logging for all MCP requests and responses with configurable log levels.

## Files
- `src/mcp/logging.ts` - Logger implementation
- `src/mcp/server.ts` - Integrate logging

## Logger Interface
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  method?: string;
  durationMs?: number;
  error?: string;
}

class McpLogger {
  private level: LogLevel = 'info';
  private sinks: LogSink[] = [consoleSink];

  setLevel(level: LogLevel): void { this.level = level; }
  addSink(sink: LogSink): void { this.sinks.push(sink); }

  log(entry: LogEntry): void {
    if (this.shouldLog(entry.level)) {
      this.sinks.forEach(s => s.write(entry));
    }
  }

  request(requestId: string, method: string, params: unknown): void {
    this.log({ timestamp: new Date().toISOString(), level: 'debug', message: `→ ${method}`, requestId, method });
  }

  response(requestId: string, method: string, durationMs: number, error?: Error): void {
    this.log({ 
      timestamp: new Date().toISOString(), 
      level: error ? 'error' : 'info', 
      message: `← ${method} (${durationMs}ms)`, 
      requestId, method, durationMs, error: error?.message 
    });
  }
}
```

## Integration in Server
```typescript
// In VibemateMcpServer.start()
this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
  const start = Date.now();
  this.logger.request(request.id, 'initialize', request.params);
  try {
    const result = await this.handleInitialize(request);
    this.logger.response(request.id, 'initialize', Date.now() - start);
    return result;
  } catch (err) {
    this.logger.response(request.id, 'initialize', Date.now() - start, err);
    throw err;
  }
});
```

## Must-Haves
- [ ] Logs: initialize, tools/list, tools/call with request IDs
- [ ] Log levels: debug (requests), info (responses), error (failures)
- [ ] Duration tracking for each request
- [ ] Configurable log level via env var (VIBEMATE_LOG_LEVEL)
- [ ] Structured JSON output option (VIBEMATE_LOG_FORMAT=json)

## Verification
```bash
VIBEMATE_LOG_LEVEL=debug node dist/index.js
# Send requests, verify logs show:
# → initialize (req-1)
# ← initialize (12ms)
# → tools/list (req-2)
# ← tools/list (3ms)
```