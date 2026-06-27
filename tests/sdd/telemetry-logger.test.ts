// Vibemate SDD — Telemetry Logger Tests

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  logEvent,
  logPhase,
  logDecision,
  logMetric,
  getLogs,
  TelemetryEvent,
} from '../../src/sdd/telemetry-logger';

describe('Telemetry Logger', () => {
  beforeEach(() => {
    // Clear logs before each test
    getLogs().length = 0;
  });

  describe('logEvent', () => {
    it('should log event with timestamp', () => {
      const event: TelemetryEvent = {
        type: 'phase_start',
        phase: 'think',
        message: 'Starting think phase',
        timestamp: Date.now(),
      };
      logEvent(event);
      const logs = getLogs();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[logs.length - 1].type).toBe('phase_start');
    });

    it('should include metadata', () => {
      const event: TelemetryEvent = {
        type: 'decision',
        phase: 'plan',
        message: 'Selected architecture',
        metadata: { choice: 'hexagonal' },
        timestamp: Date.now(),
      };
      logEvent(event);
      const logs = getLogs();
      expect(logs[logs.length - 1].metadata).toBeDefined();
    });
  });

  describe('logPhase', () => {
    it('should log phase start', () => {
      logPhase('think', 'start');
      const logs = getLogs();
      expect(logs[logs.length - 1].phase).toBe('think');
    });

    it('should log phase complete', () => {
      logPhase('think', 'complete');
      const logs = getLogs();
      expect(logs[logs.length - 1].message).toContain('complete');
    });

    it('should log phase failure', () => {
      logPhase('build', 'failed', 'Test failed');
      const logs = getLogs();
      expect(logs[logs.length - 1].message).toContain('failed');
    });
  });

  describe('logDecision', () => {
    it('should log decision with rationale', () => {
      logDecision('Use SQLite', 'Performance benchmark shows 1.58x speedup', {
        benchmark: 'db-001',
        value: 1.58,
      });
      const logs = getLogs();
      expect(logs[logs.length - 1].type).toBe('decision');
    });
  });

  describe('logMetric', () => {
    it('should log metric with value', () => {
      logMetric('test_count', 344, 'tests');
      const logs = getLogs();
      expect(logs[logs.length - 1].type).toBe('metric');
    });
  });

  describe('getLogs', () => {
    it('should return all logs', () => {
      logPhase('think', 'start');
      logPhase('plan', 'start');
      const logs = getLogs();
      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by phase', () => {
      logPhase('think', 'start');
      logPhase('plan', 'start');
      const thinkLogs = getLogs('think');
      expect(thinkLogs.every(l => l.phase === 'think')).toBe(true);
    });
  });
});
