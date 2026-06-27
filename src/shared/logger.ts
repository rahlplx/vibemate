import type { LogLevel, LogEntry, LogSink } from './types.js';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class ConsoleSink implements LogSink {
  write(entry: LogEntry): void {
    const prefix = `[${entry.level.toUpperCase()}]`;
    const requestInfo = entry.requestId ? ` [${entry.requestId}]` : '';
    const methodInfo = entry.method ? ` ${entry.method}` : '';
    const durationInfo = entry.durationMs !== undefined ? ` (${entry.durationMs}ms)` : '';
    const errorInfo = entry.error ? ` ERROR: ${entry.error}` : '';

    console.error(
      `${entry.timestamp} ${prefix}${requestInfo}${methodInfo}${durationInfo} ${entry.message}${errorInfo}`,
    );
  }
}

export class StructuredLogger {
  private level: LogLevel = 'info';
  private sinks: LogSink[] = [new ConsoleSink()];

  constructor(config?: { level?: LogLevel; sinks?: LogSink[] }) {
    if (config?.level) {
      this.level = config.level;
    } else if (process.env.VIBEMATE_LOG_LEVEL) {
      this.level = process.env.VIBEMATE_LOG_LEVEL as LogLevel;
    }
    if (config?.sinks) {
      this.sinks = config.sinks;
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
      this.sinks.forEach((s) => s.write(entry));
    }
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      ...meta,
    });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      ...meta,
    });
  }

  error(message: string, error?: Error, meta?: Record<string, unknown>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      error: error?.message,
      ...meta,
    });
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      ...meta,
    });
  }
}

export function createLogger(config?: { level?: LogLevel; sinks?: LogSink[] }): StructuredLogger {
  return new StructuredLogger(config);
}
