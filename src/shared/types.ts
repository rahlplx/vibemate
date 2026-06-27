export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  requestId?: string;
  method?: string;
  durationMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LogSink {
  write(entry: LogEntry): void;
}
