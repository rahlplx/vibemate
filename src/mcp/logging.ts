// MCP Server Logging
import type { LogLevel, LogEntry, ServerConfig } from './types.js';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

class ConsoleSink {
  write(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}]`;
    const requestInfo = entry.requestId ? ` [${entry.requestId}]` : '';
    const methodInfo = entry.method ? ` ${entry.method}` : '';
    const durationInfo = entry.durationMs !== undefined ? ` (${entry.durationMs}ms)` : '';
    const errorInfo = entry.error ? ` ERROR: ${entry.error}` : '';
    
    console.log(`${entry.timestamp} ${prefix}${requestInfo}${methodInfo}${durationInfo} ${entry.message}${errorInfo}`);
  }
}

export interface LogSink {
  write(entry: LogEntry): void;
}

export class McpLogger {
  private level: LogLevel = 'info';
  private sinks: LogSink[] = [new ConsoleSink()];

  constructor(config?: ServerConfig) {
    if (config?.logLevel) {
      this.setLevel(config.logLevel);
    } else if (process.env.VIBEMATE_LOG_LEVEL) {
      this.setLevel(process.env.VIBEMATE_LOG_LEVEL as LogLevel);
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  addSink(sink: LogSink): void {
    this.sinks.push(sink);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  log(entry: LogEntry): void {
    if (this.shouldLog(entry.level)) {
      this.sinks.forEach(s => s.write(entry));
    }
  }

  request(requestId: string, method: string, _params: unknown): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message: `→ ${method}`,
      requestId,
      method
    });
  }

  response(requestId: string, method: string, durationMs: number, error?: Error): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: error ? 'error' : 'info',
      message: `← ${method} (${durationMs}ms)`,
      requestId,
      method,
      durationMs,
      error: error?.message
    });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...meta
    });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...meta
    });
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: error?.message,
      ...meta
    });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      ...meta
    });
  }
}

export function createLogger(config?: ServerConfig): McpLogger {
  return new McpLogger(config);
}