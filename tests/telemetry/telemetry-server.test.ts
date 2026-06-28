import { describe, it, expect, beforeEach } from 'bun:test';
import { TelemetryCollector, TelemetryServer } from '../../src/telemetry/collector.js';

function makeServer() {
  const collector = new TelemetryCollector({
    enabled: true,
    exportDir: '/tmp/test-telemetry-server',
    serviceName: 'test',
    serviceVersion: '0.0.1',
  });
  const server = new TelemetryServer(collector);
  return { collector, server };
}

describe('TelemetryServer — MCP integration wrapper', () => {
  let server: TelemetryServer;

  beforeEach(() => {
    ({ server } = makeServer());
  });

  it('record_agent_turn returns AgentTurn shape', async () => {
    const result = await server.handleToolCall('record_agent_turn', {
      agentId: 'agent-1', model: 'claude-haiku', inputTokens: 100, outputTokens: 50, cost: 0.001
    }) as Record<string, unknown>;
    expect(result.agentId).toBe('agent-1');
    expect(result.model).toBe('claude-haiku');
    expect(result.inputTokens).toBe(100);
    expect(result.outputTokens).toBe(50);
    expect(result.name).toBe('agent.turn');
  });

  it('record_tool_call returns ToolCall shape', async () => {
    const result = await server.handleToolCall('record_tool_call', {
      toolName: 'search', input: { q: 'test' }, output: ['result'], duration: 42, success: true
    }) as Record<string, unknown>;
    expect(result.toolName).toBe('search');
    expect(result.duration).toBe(42);
    expect(result.name).toBe('tool.call');
  });

  it('record_handoff returns HandoffSpan shape', async () => {
    const result = await server.handleToolCall('record_handoff', {
      fromAgent: 'a', toAgent: 'b', contextSize: 1000
    }) as Record<string, unknown>;
    expect(result.fromAgent).toBe('a');
    expect(result.toAgent).toBe('b');
    expect(result.contextSize).toBe(1000);
  });

  it('get_metrics returns TelemetryMetrics shape', async () => {
    const result = await server.handleToolCall('get_metrics', {}) as Record<string, unknown>;
    expect(typeof result.totalTokens).toBe('number');
    expect(typeof result.errorRate).toBe('number');
    expect(typeof result.totalCost).toBe('number');
    expect(typeof result.averageLatency).toBe('number');
    expect(typeof result.toolFailureRate).toBe('number');
    expect(typeof result.stuckDetections).toBe('number');
  });

  it('detect_stuck returns { stuck: boolean }', async () => {
    const result = await server.handleToolCall('detect_stuck', { toolName: 'search', threshold: 5 }) as Record<string, unknown>;
    expect(typeof result.stuck).toBe('boolean');
    expect(result.stuck).toBe(false);
  });

  it('export returns { exported: true }', async () => {
    const result = await server.handleToolCall('export', {});
    expect(result).toEqual({ exported: true });
  });

  it('unknown tool throws', async () => {
    await expect(server.handleToolCall('nonexistent', {})).rejects.toThrow('Unknown tool: nonexistent');
  });

  it('handleResourceRead telemetry://metrics returns valid JSON', async () => {
    const result = await server.handleResourceRead('telemetry://metrics');
    expect(typeof result).toBe('string');
    const parsed = JSON.parse(result);
    expect(typeof parsed.totalTokens).toBe('number');
    expect(typeof parsed.errorRate).toBe('number');
  });

  it('handleResourceRead unknown URI throws', async () => {
    await expect(server.handleResourceRead('bad://uri')).rejects.toThrow('Unknown resource');
  });
});
