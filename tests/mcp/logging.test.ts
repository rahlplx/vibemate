import { describe, it, expect } from 'bun:test';
import { McpLogger, createLogger } from '../../src/mcp/logging.js';
import type { LogSink } from '../../src/mcp/logging.js';
import type { LogEntry } from '../../src/mcp/types.js';

function captureLogger(): { logger: McpLogger; entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  const sink: LogSink = { write: (e) => entries.push(e) };
  const logger = new McpLogger();
  logger.addSink(sink);
  return { logger, entries };
}

describe('McpLogger', () => {
  it('createLogger returns McpLogger instance', () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(McpLogger);
  });

  it('logs info message', () => {
    const { logger, entries } = captureLogger();
    logger.info('hello world');
    const match = entries.find(e => e.message === 'hello world');
    expect(match).toBeDefined();
    expect(match!.level).toBe('info');
  });

  it('logs warn message', () => {
    const { logger, entries } = captureLogger();
    logger.warn('watch out');
    const match = entries.find(e => e.message === 'watch out');
    expect(match!.level).toBe('warn');
  });

  it('logs error message with error object', () => {
    const { logger, entries } = captureLogger();
    logger.error('something broke', new Error('boom'));
    const match = entries.find(e => e.message === 'something broke');
    expect(match!.level).toBe('error');
    expect(match!.error).toBe('boom');
  });

  it('logs debug message when level is debug', () => {
    const { logger, entries } = captureLogger();
    logger.setLevel('debug');
    logger.debug('debug info');
    const match = entries.find(e => e.message === 'debug info');
    expect(match).toBeDefined();
    expect(match!.level).toBe('debug');
  });

  it('suppresses debug when level is info', () => {
    const { logger, entries } = captureLogger();
    logger.setLevel('info');
    logger.debug('should be hidden');
    expect(entries.find(e => e.message === 'should be hidden')).toBeUndefined();
  });

  it('logs request at debug level', () => {
    const { logger, entries } = captureLogger();
    logger.setLevel('debug');
    logger.request('req-1', 'tools/list', {});
    const match = entries.find(e => e.requestId === 'req-1');
    expect(match).toBeDefined();
    expect(match!.method).toBe('tools/list');
  });

  it('logs response at info level', () => {
    const { logger, entries } = captureLogger();
    logger.response('req-1', 'tools/list', 42);
    const match = entries.find(e => e.requestId === 'req-1');
    expect(match).toBeDefined();
    expect(match!.durationMs).toBe(42);
    expect(match!.level).toBe('info');
  });

  it('logs response as error when error is provided', () => {
    const { logger, entries } = captureLogger();
    logger.response('req-2', 'tools/call', 10, new Error('fail'));
    const match = entries.find(e => e.requestId === 'req-2');
    expect(match!.level).toBe('error');
  });

  it('respects logLevel from config', () => {
    const logger = createLogger({ logLevel: 'warn' } as Parameters<typeof createLogger>[0]);
    const entries: LogEntry[] = [];
    logger.addSink({ write: (e) => entries.push(e) });
    logger.info('should be hidden');
    logger.warn('should appear');
    expect(entries.find(e => e.message === 'should be hidden')).toBeUndefined();
    expect(entries.find(e => e.message === 'should appear')).toBeDefined();
  });
});
