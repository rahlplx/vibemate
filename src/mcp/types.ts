// MCP Server Types

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  method?: string;
  durationMs?: number;
  error?: string;
}

export interface LogSink {
  write(entry: LogEntry): void;
}

export interface ServerConfig {
  logLevel?: LogLevel;
  name?: string;
  version?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Minimum subscription tier required to call this tool. Defaults to 'free'. */
  minTier?: 'free' | 'pro' | 'team' | 'enterprise';
}

export interface ToolHandler {
  (args: unknown): Promise<ToolResult>;
}

export interface ToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  structuredContent?: unknown;
}

export interface ToolRegistration {
  definition: ToolDefinition;
  handler: ToolHandler;
}

export interface StackProfile {
  framework: 'nextjs' | 'express' | 'fastapi' | 'laravel' | 'generic';
  language: 'typescript' | 'javascript' | 'python' | 'php';
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | 'pip' | 'composer';
  hasTypeScript: boolean;
  hasTailwind: boolean;
  hasDatabase: boolean;
  database?: 'postgres' | 'mysql' | 'sqlite' | 'mongodb';
  confidence: 'high' | 'medium' | 'low';
  rawMarkers: string[];
}