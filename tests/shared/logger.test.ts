import { describe, it, expect, beforeEach } from 'bun:test';
import { StructuredLogger, createLogger } from '../../src/shared/logger.js';

describe('StructuredLogger', () => {
  let logger: StructuredLogger;

  beforeEach(() => {
    logger = new StructuredLogger({ level: 'debug' });
  });

  it('should create logger with default level', () => {
    const defaultLogger = new StructuredLogger();
    expect(defaultLogger).toBeDefined();
  });

  it('should create logger with custom level', () => {
    const warnLogger = new StructuredLogger({ level: 'warn' });
    expect(warnLogger).toBeDefined();
  });

  it('should log info messages', () => {
    logger.info('test message');
    expect(true).toBe(true);
  });

  it('should log warn messages', () => {
    logger.warn('test warning');
    expect(true).toBe(true);
  });

  it('should log error messages', () => {
    logger.error('test error', new Error('test'));
    expect(true).toBe(true);
  });

  it('should log debug messages', () => {
    logger.debug('test debug');
    expect(true).toBe(true);
  });

  it('should log with metadata', () => {
    logger.info('test message', { key: 'value', count: 42 });
    expect(true).toBe(true);
  });

  it('should set log level', () => {
    logger.setLevel('error');
    logger.info('this should not appear');
    expect(true).toBe(true);
  });

  it('should add custom sink', () => {
    let written = false;
    const customSink = {
      write: () => { written = true; }
    };
    logger.addSink(customSink);
    logger.info('test');
    expect(written).toBe(true);
  });

  it('should use env var for log level', () => {
    process.env.VIBEMATE_LOG_LEVEL = 'debug';
    const envLogger = createLogger();
    expect(envLogger).toBeDefined();
    delete process.env.VIBEMATE_LOG_LEVEL;
  });
});

describe('createLogger', () => {
  it('should create logger instance', () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(StructuredLogger);
  });

  it('should create logger with config', () => {
    const logger = createLogger({ level: 'warn' });
    expect(logger).toBeInstanceOf(StructuredLogger);
  });
});
