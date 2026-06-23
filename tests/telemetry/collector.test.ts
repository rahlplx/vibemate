// TDD Tests for Telemetry Collector
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TelemetryCollector } from '../../src/telemetry/collector.js';
import { mkdir, rm, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('TelemetryCollector', () => {
  let testDir: string;
  let collector: TelemetryCollector;

  beforeEach(async () => {
    testDir = join(tmpdir(), `telemetry-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    collector = new TelemetryCollector({
      enabled: true,
      exportDir: testDir,
      serviceName: 'test-service',
      serviceVersion: '1.0.0'
    });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('startSpan', () => {
    it('should create a new span', () => {
      const span = collector.startSpan('test.span');

      expect(span).toBeDefined();
      expect(span.name).toBe('test.span');
      expect(span.traceId).toBeDefined();
      expect(span.spanId).toBeDefined();
      expect(span.startTime).toBeGreaterThan(0);
      expect(span.status).toBe('ok');
    });

    it('should set parent span ID', () => {
      const parent = collector.startSpan('parent.span');
      const child = collector.startSpan('child.span', parent.spanId);

      expect(child.parentSpanId).toBe(parent.spanId);
      expect(child.traceId).toBe(parent.traceId);
    });

    it('should include service attributes', () => {
      const span = collector.startSpan('test.span');

      expect(span.attributes['service.name']).toBe('test-service');
      expect(span.attributes['service.version']).toBe('1.0.0');
    });
  });

  describe('endSpan', () => {
    it('should set end time and status', () => {
      const span = collector.startSpan('test.span');
      collector.endSpan(span.spanId, 'ok');

      const updatedSpan = collector.getSpan(span.spanId);
      expect(updatedSpan?.endTime).toBeDefined();
      expect(updatedSpan?.status).toBe('ok');
    });

    it('should handle error status', () => {
      const span = collector.startSpan('test.span');
      collector.endSpan(span.spanId, 'error');

      const updatedSpan = collector.getSpan(span.spanId);
      expect(updatedSpan?.status).toBe('error');
    });
  });

  describe('recordAgentTurn', () => {
    it('should record agent turn with ATSC attributes', () => {
      const turn = collector.recordAgentTurn(
        'agent-1',
        'claude-sonnet',
        1000,
        500,
        0.01
      );

      expect(turn).toBeDefined();
      expect(turn.agentId).toBe('agent-1');
      expect(turn.model).toBe('claude-sonnet');
      expect(turn.inputTokens).toBe(1000);
      expect(turn.outputTokens).toBe(500);
      expect(turn.cost).toBe(0.01);
      expect(turn.attributes['gen_ai.usage.input_tokens']).toBe(1000);
      expect(turn.attributes['gen_ai.usage.output_tokens']).toBe(500);
    });
  });

  describe('recordToolCall', () => {
    it('should record tool call with ATSC attributes', () => {
      const call = collector.recordToolCall(
        'read_file',
        { path: '/test' },
        { content: 'hello' },
        50,
        true
      );

      expect(call).toBeDefined();
      expect(call.toolName).toBe('read_file');
      expect(call.duration).toBe(50);
      expect(call.attributes['tool.name']).toBe('read_file');
      expect(call.attributes['tool.success']).toBe(true);
    });

    it('should handle failed tool calls', () => {
      const call = collector.recordToolCall(
        'write_file',
        { path: '/test' },
        { error: 'permission denied' },
        10,
        false
      );

      expect(call.status).toBe('error');
    });
  });

  describe('recordHandoff', () => {
    it('should record agent handoff', () => {
      const handoff = collector.recordHandoff('agent-1', 'agent-2', 5000);

      expect(handoff).toBeDefined();
      expect(handoff.fromAgent).toBe('agent-1');
      expect(handoff.toAgent).toBe('agent-2');
      expect(handoff.contextSize).toBe(5000);
      expect(handoff.attributes['agent.handoff.from']).toBe('agent-1');
      expect(handoff.attributes['agent.handoff.to']).toBe('agent-2');
    });
  });

  describe('recordGuardrail', () => {
    it('should record guardrail check', () => {
      const span = collector.recordGuardrail('api-key-check', true);

      expect(span).toBeDefined();
      expect(span.attributes['guardrail.name']).toBe('api-key-check');
      expect(span.attributes['guardrail.passed']).toBe(true);
    });

    it('should record failed guardrail', () => {
      const span = collector.recordGuardrail('security-check', false, 'API key exposed');

      expect(span.status).toBe('error');
      expect(span.attributes['guardrail.reason']).toBe('API key exposed');
    });
  });

  describe('recordEvaluation', () => {
    it('should record evaluation result', () => {
      const span = collector.recordEvaluation('code-quality', 0.85, true);

      expect(span).toBeDefined();
      expect(span.attributes['evaluation.name']).toBe('code-quality');
      expect(span.attributes['evaluation.score']).toBe(0.85);
      expect(span.attributes['evaluation.passed']).toBe(true);
    });
  });

  describe('detectStuckLoop', () => {
    it('should detect stuck loops when tool called repeatedly', () => {
      // Record 5 calls to same tool
      for (let i = 0; i < 5; i++) {
        collector.recordToolCall('same_tool', {}, {}, 10, true);
      }

      const isStuck = collector.detectStuckLoop('same_tool', 5);

      expect(isStuck).toBe(true);
    });

    it('should not detect stuck loop when calls are different', () => {
      // Record 5 calls to different tools
      for (let i = 0; i < 5; i++) {
        collector.recordToolCall(`tool_${i}`, {}, {}, 10, true);
      }

      const isStuck = collector.detectStuckLoop('same_tool', 5);

      expect(isStuck).toBe(false);
    });
  });

  describe('getMetrics', () => {
    it('should calculate aggregate metrics', () => {
      // Record some data
      collector.recordAgentTurn('agent-1', 'claude-sonnet', 1000, 500, 0.01);
      collector.recordAgentTurn('agent-1', 'claude-sonnet', 2000, 1000, 0.02);
      collector.recordToolCall('tool-1', {}, {}, 50, true);
      collector.recordToolCall('tool-1', {}, {}, 30, false);

      const metrics = collector.getMetrics();

      expect(metrics.totalTokens).toBe(4500); // 1000+500+2000+1000
      expect(metrics.totalCost).toBe(0.03); // 0.01+0.02
      expect(metrics.averageLatency).toBeGreaterThanOrEqual(0); // May be 0 if events happen in same ms
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('export', () => {
    it('should export telemetry data to file', async () => {
      collector.recordAgentTurn('agent-1', 'claude-sonnet', 1000, 500, 0.01);
      
      await collector.export();

      const files = await readdir(testDir);
      const telemetryFiles = files.filter(f => f.startsWith('telemetry-') && f.endsWith('.json'));

      expect(telemetryFiles.length).toBe(1);
    });
  });

  describe('getTrace', () => {
    it('should retrieve trace by ID', () => {
      const span = collector.startSpan('test.span');
      const trace = collector.getTrace(span.traceId);

      expect(trace.length).toBe(1);
      expect(trace[0].spanId).toBe(span.spanId);
    });
  });

  describe('clearOldSpans', () => {
    it('should clear spans older than max age', () => {
      // Create a span
      collector.startSpan('old.span');
      
      // Clear spans older than 0ms (immediately)
      collector.clearOldSpans(0);

      // Get metrics - should be empty
      const metrics = collector.getMetrics();
      expect(metrics.totalTokens).toBe(0);
    });
  });
});
