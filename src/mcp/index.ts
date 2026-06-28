import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { specToolDefinition, specToolHandler } from './tools/spec.js';
import { autoCompleteToolDefinition, autoCompleteToolHandler } from './tools/auto-complete.js';
import { autoFixToolDefinition, autoFixToolHandler } from './tools/auto-fix.js';
import { simulationToolDefinition, simulationToolHandler } from './tools/simulation.js';
import { StackDetector } from './stack-detector.js';
import { createAuthManager, type AuthManager } from './auth.js';
import { createAuthMiddleware, type AuthMiddleware } from './auth-middleware.js';

interface ServerConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  method?: string;
  durationMs?: number;
  error?: string;
}

type LogSink = (entry: LogEntry) => void;

class McpLogger {
  private level: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private sinks: LogSink[] = [];
  private levelOrder = { debug: 0, info: 1, warn: 2, error: 3 };

  constructor(logLevel: 'debug' | 'info' | 'warn' | 'error') {
    this.level = logLevel;
    this.sinks.push(this.consoleSink);
  }

  setLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
    this.level = level;
  }

  addSink(sink: LogSink): void {
    this.sinks.push(sink);
  }

  private shouldLog(level: 'debug' | 'info' | 'warn' | 'error'): boolean {
    return this.levelOrder[level] >= this.levelOrder[this.level];
  }

  private consoleSink = (entry: LogEntry): void => {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const duration = entry.durationMs ? ` (${entry.durationMs}ms)` : '';
    const error = entry.error ? ` ERROR: ${entry.error}` : '';
    console.error(`${prefix} ${entry.message}${duration}${error}`);
  };

  log(entry: LogEntry): void {
    if (this.shouldLog(entry.level as 'debug' | 'info' | 'warn' | 'error')) {
      this.sinks.forEach(s => s(entry));
    }
  }

  request(method: string): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message: `→ ${method}`,
      method
    });
  }

  response(method: string, durationMs: number, error?: Error): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: error ? 'error' : 'info',
      message: `← ${method}`,
      method,
      durationMs,
      error: error?.message
    });
  }
}

export class VibemateMcpServer {
  private server: Server;
  private transport: StdioServerTransport;
  private logger: McpLogger;
  private stackDetector: StackDetector;
  private authManager: AuthManager;
  private authMiddleware: AuthMiddleware;
  private tools = new Map<string, { definition: unknown; handler: Function }>();

  constructor(config: ServerConfig) {
    this.logger = new McpLogger(config.logLevel);
    this.stackDetector = new StackDetector();
    this.authManager = createAuthManager();
    this.authMiddleware = createAuthMiddleware(this.authManager);
    
    this.server = new Server(
      { name: 'vibemate', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    this.transport = new StdioServerTransport();
    this.setupHandlers();
    this.registerBuiltinTools();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(InitializeRequestSchema, async () => {
      const start = Date.now();
      this.logger.request('initialize');
      try {
        const result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'vibemate', version: '1.0.0' }
        };
        this.logger.response('initialize', Date.now() - start);
        return result;
      } catch (err) {
        this.logger.response('initialize', Date.now() - start, err as Error);
        throw err;
      }
    });

    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const start = Date.now();
      this.logger.request('tools/list');
      try {
        const result = {
          tools: Array.from(this.tools.values()).map(t => t.definition)
        };
        this.logger.response('tools/list', Date.now() - start);
        return result;
      } catch (err) {
        this.logger.response('tools/list', Date.now() - start, err as Error);
        throw err;
      }
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const start = Date.now();
      this.logger.request(`tools/call:${request.params.name}`);
      try {
        const tool = this.tools.get(request.params.name);
        if (!tool) {
          throw new Error(`Tool not found: ${request.params.name}`);
        }
        const result = await tool.handler(request.params.arguments);
        this.logger.response(`tools/call:${request.params.name}`, Date.now() - start);
        return result;
      } catch (err) {
        this.logger.response(`tools/call:${request.params.name}`, Date.now() - start, err as Error);
        throw err;
      }
    });
  }

  private registerBuiltinTools(): void {
    this.registerTool(specToolDefinition, specToolHandler);
    this.registerTool(autoCompleteToolDefinition, autoCompleteToolHandler);
    this.registerTool(autoFixToolDefinition, autoFixToolHandler);
    this.registerTool(simulationToolDefinition, simulationToolHandler);
  }

  registerTool(definition: unknown, handler: Function): void {
    const def = definition as { name: string };
    this.tools.set(def.name, { definition, handler });
  }

  async start(): Promise<void> {
    await this.server.connect(this.transport);
    this.logger.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'MCP server started on stdio'
    });
  }

  async stop(): Promise<void> {
    await this.server.close();
    this.logger.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'MCP server stopped'
    });
  }

  getLogger(): McpLogger {
    return this.logger;
  }

  getStackDetector(): StackDetector {
    return this.stackDetector;
  }

  getAuthManager(): AuthManager {
    return this.authManager;
  }

  getAuthMiddleware(): AuthMiddleware {
    return this.authMiddleware;
  }
}

const logLevel = (process.env.VIBEMATE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info';
const server = new VibemateMcpServer({ logLevel });

process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});

await server.start();
