// Telemetry & Observability - OpenTelemetry + ATSC semantic conventions
import { TelemetrySpan, AgentTurn, ToolCall, HandoffSpan, TelemetryMetrics, LoopReport, AnomalyEvent, SubAgentSpan, LLMPrompt, LLMResponse, DeepLearningRecord, SpanContent } from '../types.js';
import { writeFile, readFile, mkdir, readdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { PersistenceManager } from '../shared/persistence.js';
import { classifyFailure } from '../shared/failure-classification.js';
import { ContentStore } from './content-store.js';

export interface TelemetryConfig {
  enabled: boolean;
  exportDir: string;
  serviceName: string;
  serviceVersion: string;
  persistence?: PersistenceManager;
  maxSpanCount?: number;
  evictionStrategy?: 'lru' | 'priority';
  anomalyThreshold?: number;
  contentStore?: ContentStore;
}

export interface RetentionStats {
  currentCount: number;
  totalEvicted: number;
  maxSpanCount: number;
}

class SpanRetentionPolicy {
  private maxSpanCount: number;
  private strategy: 'lru' | 'priority';
  private totalEvicted: number = 0;

  constructor(maxSpanCount: number, strategy: 'lru' | 'priority') {
    this.maxSpanCount = maxSpanCount;
    this.strategy = strategy;
  }

  evictIfNeeded(spans: TelemetrySpan[], traces: Map<string, TelemetrySpan[]>): TelemetrySpan[] {
    if (spans.length <= this.maxSpanCount) return spans;

    const overflow = spans.length - this.maxSpanCount;
    let toEvict: Set<string>;

    if (this.strategy === 'priority') {
      // Sort: errors last (keep), ok first (evict), then oldest first within each group
      const sorted = [...spans].sort((a, b) => {
        if (a.status === 'error' && b.status !== 'error') return 1;
        if (a.status !== 'error' && b.status === 'error') return -1;
        return a.startTime - b.startTime;
      });
      toEvict = new Set(sorted.slice(0, overflow).map(s => s.spanId));
    } else {
      // LRU: evict oldest by startTime
      const sorted = [...spans].sort((a, b) => a.startTime - b.startTime);
      toEvict = new Set(sorted.slice(0, overflow).map(s => s.spanId));
    }

    this.totalEvicted += toEvict.size;

    // Prune only affected traces by grouping evicted spans by traceId (O(evicted) vs O(all traces))
    const evictedByTrace = new Map<string, Set<string>>();
    for (const span of spans) {
      if (!toEvict.has(span.spanId)) continue;
      const ids = evictedByTrace.get(span.traceId) ?? new Set();
      ids.add(span.spanId);
      evictedByTrace.set(span.traceId, ids);
    }
    for (const [traceId, evictedIds] of evictedByTrace) {
      const traceSpans = traces.get(traceId);
      if (!traceSpans) continue;
      const remaining = traceSpans.filter(ts => !evictedIds.has(ts.spanId));
      if (remaining.length === 0) {
        traces.delete(traceId);
      } else {
        traces.set(traceId, remaining);
      }
    }

    return spans.filter(s => !toEvict.has(s.spanId));
  }

  getTotalEvicted(): number {
    return this.totalEvicted;
  }

  getMaxSpanCount(): number {
    return this.maxSpanCount;
  }

  reset(): void {
    this.totalEvicted = 0;
  }
}

interface WelfordBaseline {
  mean: number;
  m2: number;
  count: number;
}

export class TelemetryCollector {
  private config: TelemetryConfig;
  private spanMap: Map<string, TelemetrySpan> = new Map();
  private traces: Map<string, TelemetrySpan[]> = new Map();
  private persistence?: PersistenceManager;
  private retentionPolicy: SpanRetentionPolicy;
  private contentStore?: ContentStore;
  // Track which spanIds have content stored (for JSONL export assembly)
  private contentSpanIds: Set<string> = new Set();
  // Welford running stats per span name (latency baseline)
  private baseline: Map<string, WelfordBaseline> = new Map();
  // Spans added since last export (for anomaly scanning)
  private spansSinceExport: TelemetrySpan[] = [];

  constructor(config: TelemetryConfig) {
    this.config = config;
    this.persistence = config.persistence;
    this.contentStore = config.contentStore;
    this.retentionPolicy = new SpanRetentionPolicy(
      config.maxSpanCount ?? 10_000,
      config.evictionStrategy ?? 'priority'
    );
  }

  // Start a new span
  startSpan(name: string, parentSpanId?: string, attributes: Record<string, unknown> = {}): TelemetrySpan {
    const span: TelemetrySpan = {
      name,
      traceId: parentSpanId ? this.getTraceId(parentSpanId) : randomUUID(),
      spanId: randomUUID(),
      parentSpanId,
      startTime: Date.now(),
      attributes: {
        ...attributes,
        'service.name': this.config.serviceName,
        'service.version': this.config.serviceVersion
      },
      status: 'ok'
    };

    this.spanMap.set(span.spanId, span);

    // Add to trace
    const traceSpans = this.traces.get(span.traceId) || [];
    traceSpans.push(span);
    this.traces.set(span.traceId, traceSpans);

    // Persist if available
    if (this.persistence) {
      this.persistence.getTelemetryStore().then(store => {
        store.saveSpan({
          spanId: span.spanId,
          traceId: span.traceId,
          parentSpanId: span.parentSpanId,
          name: span.name,
          startTime: span.startTime,
          status: span.status,
          attributes: span.attributes,
          serviceName: this.config.serviceName,
          serviceVersion: this.config.serviceVersion,
        });
      });
    }

    const spansArray = Array.from(this.spanMap.values());
    const kept = this.retentionPolicy.evictIfNeeded(spansArray, this.traces);
    if (kept.length < spansArray.length) {
      const keptIds = new Set(kept.map(s => s.spanId));
      for (const id of this.spanMap.keys()) {
        if (!keptIds.has(id)) this.spanMap.delete(id);
      }
    }
    this.spansSinceExport.push(span);
    // Keep spansSinceExport bounded to the same limit as spans
    const maxCount = this.retentionPolicy.getMaxSpanCount();
    if (this.spansSinceExport.length > maxCount) {
      this.spansSinceExport.splice(0, this.spansSinceExport.length - maxCount);
    }

    return span;
  }

  // Clear the anomaly scan window without flushing to disk (call after each quality gate check)
  flushAnomalyWindow(): void {
    this.spansSinceExport = [];
  }

  getRetentionStats(): RetentionStats {
    return {
      currentCount: this.spanMap.size,
      totalEvicted: this.retentionPolicy.getTotalEvicted(),
      maxSpanCount: this.retentionPolicy.getMaxSpanCount(),
    };
  }

  // End a span
  endSpan(spanId: string, status: 'ok' | 'error' = 'ok'): void {
    const span = this.spanMap.get(spanId);
    if (span) {
      span.endTime = Date.now();
      span.status = status;
      this.updateBaseline(span);
    }
  }

  // Welford single-pass mean/variance update
  private updateBaseline(span: TelemetrySpan): void {
    if (!span.endTime) return;
    const duration = span.endTime - span.startTime;
    const key = span.name;
    const b = this.baseline.get(key) ?? { mean: 0, m2: 0, count: 0 };
    b.count++;
    const delta = duration - b.mean;
    b.mean += delta / b.count;
    const delta2 = duration - b.mean;
    b.m2 += delta * delta2;
    this.baseline.set(key, b);
  }

  // Return detected anomalies using Z-score against Welford baseline
  getAnomalies(): AnomalyEvent[] {
    const threshold = this.config.anomalyThreshold ?? 3;
    const anomalies: AnomalyEvent[] = [];
    const now = Date.now();

    // Scan completed spans
    for (const span of this.spansSinceExport) {
      if (!span.endTime) continue;
      const duration = span.endTime - span.startTime;
      const b = this.baseline.get(span.name);
      // Need at least 5 samples for meaningful baseline
      if (!b || b.count < 5) continue;

      const variance = b.count > 1 ? b.m2 / (b.count - 1) : 0;
      const stddev = Math.sqrt(variance);
      // Enforce minimum stddev floor to prevent false positives from near-zero variance
      const MIN_STDDEV_MS = 10;
      if (stddev < MIN_STDDEV_MS) continue;

      const zScore = (duration - b.mean) / stddev;
      if (Math.abs(zScore) > threshold) {
        anomalies.push({
          spanId: span.spanId,
          spanName: span.name,
          type: 'latency_spike',
          zScore,
          severity: Math.abs(zScore) > threshold * 2 ? 'critical' : 'warning',
          detectedAt: now,
        });
      }
    }

    // Scan for error surges: compare last 10 spans to historical rate
    const completed = this.spansSinceExport.filter(s => s.endTime);
    if (completed.length >= 10) {
      const recent10 = completed.slice(-10);
      const recentErrors = recent10.filter(s => s.status === 'error').length;
      const recentErrorRate = recentErrors / 10;

      const allErrors = completed.filter(s => s.status === 'error').length;
      const historicalErrorRate = allErrors / completed.length;

      if (historicalErrorRate > 0 && recentErrorRate > 1.5 * historicalErrorRate) {
        anomalies.push({
          spanId: recent10[recent10.length - 1].spanId,
          spanName: 'error_rate',
          type: 'error_surge',
          zScore: recentErrorRate / historicalErrorRate,
          severity: recentErrorRate > 0.3 ? 'critical' : 'warning',
          detectedAt: now,
        });
      }
    }

    return anomalies;
  }

  // Synchronous variant (no content store) — kept for internal use and backwards compat
  recordAgentTurnSync(agentId: string, model: string, inputTokens: number, outputTokens: number, cost: number, phase?: string): AgentTurn {
    const span = this.startSpan('agent.turn', undefined, {
      'agent.id': agentId,
      'agent.model': model,
      'gen_ai.usage.input_tokens': inputTokens,
      'gen_ai.usage.output_tokens': outputTokens,
      'gen_ai.usage.total_tokens': inputTokens + outputTokens,
      'gen_ai.cost': cost,
      ...(phase ? { 'auto.phase': phase } : {})
    });
    const turn: AgentTurn = { ...span, agentId, inputTokens, outputTokens, model, cost };
    this.spanMap.set(span.spanId, turn);
    this.endSpan(span.spanId);
    return turn;
  }

  // Record an agent turn (ATSC semantic conventions) — async when content capture is enabled
  async recordAgentTurn(
    agentId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number,
    content?: { prompt?: LLMPrompt; response?: LLMResponse; phase?: string }
  ): Promise<AgentTurn> {
    const span = this.startSpan('agent.turn', undefined, {
      'agent.id': agentId,
      'agent.model': model,
      'gen_ai.usage.input_tokens': inputTokens,
      'gen_ai.usage.output_tokens': outputTokens,
      'gen_ai.usage.total_tokens': inputTokens + outputTokens,
      'gen_ai.cost': cost,
      ...(content?.phase ? { 'auto.phase': content.phase } : {})
    });

    const turn: AgentTurn = { ...span, agentId, inputTokens, outputTokens, model, cost };
    this.spanMap.set(span.spanId, turn);
    this.endSpan(span.spanId);

    if (this.contentStore && content) {
      const spanContent: SpanContent = {
        spanId: span.spanId,
        traceId: span.traceId,
        name: 'agent.turn',
        timestamp: new Date(span.startTime).toISOString(),
        prompt: content.prompt,
        response: content.response,
        toolCalls: [],
        subAgents: [],
        metadata: { model, agentId, phase: content.phase, inputTokens, outputTokens, cost, success: true }
      };
      try {
        await this.contentStore.save(span.spanId, spanContent);
        this.contentSpanIds.add(span.spanId);
      } catch (err) {
        console.warn(`[Telemetry] Failed to save agent turn content: ${err instanceof Error ? err.message : err}`);
      }
    }

    return turn;
  }

  // Record a sub-agent invocation with its full prompt and response
  async recordSubAgent(
    parentSpanId: string,
    childAgentId: string,
    model: string,
    content?: { prompt?: LLMPrompt; response?: LLMResponse }
  ): Promise<SubAgentSpan> {
    const span = this.startSpan('agent.sub_agent', parentSpanId, {
      'agent.parent_id': (this.spanMap.get(parentSpanId) as AgentTurn | undefined)?.agentId ?? '',
      'agent.child_id': childAgentId,
      'agent.model': model
    });

    const parentAgent = this.spanMap.get(parentSpanId);
    const parentAgentId = (parentAgent as AgentTurn | undefined)?.agentId ?? '';

    const subSpan: SubAgentSpan = { ...span, parentAgentId, childAgentId, model };
    this.spanMap.set(span.spanId, subSpan);
    this.endSpan(span.spanId);

    if (this.contentStore && content) {
      const spanContent: SpanContent = {
        spanId: span.spanId,
        traceId: span.traceId,
        name: 'agent.sub_agent',
        timestamp: new Date(span.startTime).toISOString(),
        prompt: content.prompt,
        response: content.response,
        toolCalls: [],
        subAgents: [],
        metadata: { model, parentAgentId, childAgentId, success: true }
      };
      try {
        await this.contentStore.save(span.spanId, spanContent);
        this.contentSpanIds.add(span.spanId);
      } catch (err) {
        console.warn(`[Telemetry] Failed to save sub-agent content: ${err instanceof Error ? err.message : err}`);
      }
    }

    return subSpan;
  }

  // Record a tool call (ATSC semantic conventions)
  // Span attributes hold a 500-char preview for fast scanning; full I/O saved to content store.
  async recordToolCall(toolName: string, input: unknown, output: unknown, duration: number, success: boolean): Promise<ToolCall> {
    const span = this.startSpan('tool.call', undefined, {
      'tool.name': toolName,
      'tool.input_preview': JSON.stringify(input).substring(0, 500),
      'tool.output_preview': JSON.stringify(output).substring(0, 500),
      'tool.duration_ms': duration,
      'tool.success': success
    });

    this.endSpan(span.spanId, success ? 'ok' : 'error');
    const updatedSpan = this.getSpan(span.spanId) || span;
    const call: ToolCall = { ...updatedSpan, toolName, input, output, duration };

    if (this.contentStore) {
      const spanContent: SpanContent = {
        spanId: span.spanId,
        traceId: span.traceId,
        name: 'tool.call',
        timestamp: new Date(span.startTime).toISOString(),
        toolCalls: [{ name: toolName, input, output, duration, success }],
        subAgents: [],
        metadata: { toolName, duration, success }
      };
      try {
        await this.contentStore.save(span.spanId, spanContent);
        this.contentSpanIds.add(span.spanId);
      } catch (err) {
        console.warn(`[Telemetry] Failed to save tool call content: ${err instanceof Error ? err.message : err}`);
      }
    }

    return call;
  }

  // Record a handoff between agents (ATSC semantic conventions)
  recordHandoff(fromAgent: string, toAgent: string, contextSize: number): HandoffSpan {
    const span = this.startSpan('agent.handoff', undefined, {
      'agent.handoff.from': fromAgent,
      'agent.handoff.to': toAgent,
      'agent.handoff.context_size': contextSize
    });

    const handoff: HandoffSpan = {
      ...span,
      fromAgent,
      toAgent,
      contextSize
    };

    this.endSpan(span.spanId);
    return handoff;
  }

  // Record a guardrail check (ATSC semantic conventions)
  recordGuardrail(name: string, passed: boolean, reason?: string): TelemetrySpan {
    const span = this.startSpan('agent.guardrail', undefined, {
      'guardrail.name': name,
      'guardrail.passed': passed,
      'guardrail.reason': reason
    });

    this.endSpan(span.spanId, passed ? 'ok' : 'error');
    return span;
  }

  // Record an evaluation (ATSC semantic conventions)
  recordEvaluation(name: string, score: number, passed: boolean): TelemetrySpan {
    const span = this.startSpan('agent.evaluation', undefined, {
      'evaluation.name': name,
      'evaluation.score': score,
      'evaluation.passed': passed
    });

    this.endSpan(span.spanId, passed ? 'ok' : 'error');
    return span;
  }

  // Detect loops using sliding-window cycle detection on tool call sequences
  detectLoop(traceId?: string): LoopReport {
    const sourceSpans = traceId
      ? (this.traces.get(traceId) || [])
      : Array.from(this.spanMap.values());

    const toolCalls = sourceSpans
      .filter(s => s.name === 'tool.call')
      .sort((a, b) => a.startTime - b.startTime);

    if (toolCalls.length < 2) {
      return { detected: false, cycle: [], frequency: 0, severity: 'normal' };
    }

    const sequence = toolCalls.map(s => `tool.call:${s.attributes['tool.name'] as string || 'unknown'}`);

    // Sliding window: check if the last patLen elements match the patLen elements before them
    const maxPatLen = Math.floor(sequence.length / 2);
    let detectedCycle: string[] = [];

    for (let patLen = 1; patLen <= maxPatLen; patLen++) {
      const tail = sequence.slice(sequence.length - patLen);
      const prev = sequence.slice(sequence.length - 2 * patLen, sequence.length - patLen);
      if (prev.length === patLen && tail.join(',') === prev.join(',')) {
        detectedCycle = tail;
        break;
      }
    }

    if (detectedCycle.length === 0) {
      return { detected: false, cycle: [], frequency: 0, severity: 'normal' };
    }

    // Use only the cycle window (last 2*patLen spans) for accurate severity — not full history
    const cycleSpans = toolCalls.slice(-2 * detectedCycle.length);
    const windowMs = cycleSpans[cycleSpans.length - 1].startTime - cycleSpans[0].startTime;
    const frequency = windowMs > 0 ? (cycleSpans.length / windowMs) * 1000 : cycleSpans.length;

    let severity: 'rapid' | 'normal' | 'slow';
    if (windowMs < 500) {
      severity = 'rapid';
    } else if (windowMs > 5000) {
      severity = 'slow';
    } else {
      severity = 'normal';
    }

    const parentPhase = cycleSpans[0]?.attributes?.['auto.phase'] as string | undefined;

    return { detected: true, cycle: detectedCycle, frequency, severity, parentPhase };
  }

  // Deprecated — use detectLoop() instead
  detectStuckLoop(toolName: string, threshold: number = 5): boolean {
    const recentCalls = Array.from(this.spanMap.values())
      .filter(s => s.name === 'tool.call' && s.attributes['tool.name'] === toolName)
      .slice(-threshold);

    if (recentCalls.length >= threshold) return true;
    return this.detectLoop().detected;
  }

  // Get metrics
  getMetrics(): TelemetryMetrics {
    const allSpans = Array.from(this.spanMap.values());
    const agentTurns = allSpans.filter(s => s.name === 'agent.turn') as AgentTurn[];
    const toolCalls = allSpans.filter(s => s.name === 'tool.call') as ToolCall[];

    const totalTokens = agentTurns.reduce((sum, t) => sum + t.inputTokens + t.outputTokens, 0);
    const totalCost = agentTurns.reduce((sum, t) => sum + t.cost, 0);

    const latencies = agentTurns.map(t => (t.endTime || t.startTime) - t.startTime);
    const averageLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

    const errors = allSpans.filter(s => s.status === 'error').length;
    const errorRate = allSpans.length > 0 ? errors / allSpans.length : 0;

    const toolFailures = toolCalls.filter(t => t.status === 'error').length;
    const toolFailureRate = toolCalls.length > 0 ? toolFailures / toolCalls.length : 0;

    const stuckDetections = this.detectStuckLoop('tool.call') ? 1 : 0;

    return {
      totalTokens,
      totalCost,
      averageLatency,
      errorRate,
      toolFailureRate,
      stuckDetections
    };
  }

  // Export a JSONL deep-learning dataset from all captured content
  async exportDeepLearning(outputPath?: string): Promise<number> {
    const outPath = outputPath ?? join(this.config.exportDir, `deeplearning-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`);
    await mkdir(this.config.exportDir, { recursive: true });

    const lines: string[] = [];

    if (this.contentStore && this.contentSpanIds.size > 0) {
      // Rich path: assemble from content store
      for (const spanId of this.contentSpanIds) {
        const content = await this.contentStore.load(spanId);
        if (!content) continue;
        const span = this.spanMap.get(spanId);
        const type: DeepLearningRecord['type'] =
          content.name === 'agent.turn' ? 'agent_turn' :
          content.name === 'agent.sub_agent' ? 'sub_agent' :
          content.name === 'tool.call' ? 'tool_call' : 'handoff';

        const record: DeepLearningRecord = {
          id: spanId,
          timestamp: content.timestamp,
          type,
          prompt: content.prompt,
          response: content.response,
          toolCalls: content.toolCalls.length ? content.toolCalls : undefined,
          subAgents: content.subAgents.length ? content.subAgents : undefined,
          metadata: {
            ...content.metadata,
            traceId: content.traceId,
            success: span?.status === 'ok'
          }
        };
        lines.push(JSON.stringify(record));
      }
    } else {
      // Fallback: build minimal records from span metadata only
      for (const span of this.spanMap.values()) {
        if (span.name !== 'agent.turn') continue;
        const turn = span as AgentTurn;
        const record: DeepLearningRecord = {
          id: span.spanId,
          timestamp: new Date(span.startTime).toISOString(),
          type: 'agent_turn',
          metadata: {
            model: turn.model,
            agentId: turn.agentId,
            inputTokens: turn.inputTokens,
            outputTokens: turn.outputTokens,
            cost: turn.cost,
            traceId: span.traceId,
            success: span.status === 'ok'
          }
        };
        lines.push(JSON.stringify(record));
      }
    }

    await writeFile(outPath, lines.join('\n') + (lines.length ? '\n' : ''), 'utf-8');
    return lines.length;
  }

  // Export telemetry data
  async export(): Promise<void> {
    if (!this.config.enabled) return;

    await mkdir(this.config.exportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportFile = join(this.config.exportDir, `telemetry-${timestamp}.json`);
    
    const exportData = {
      serviceName: this.config.serviceName,
      serviceVersion: this.config.serviceVersion,
      exportTime: new Date().toISOString(),
      spans: Array.from(this.spanMap.values()),
      metrics: this.getMetrics(),
      traces: Object.fromEntries(this.traces)
    };

    await writeFile(exportFile, JSON.stringify(exportData, null, 2));

    this.spanMap.clear();
    this.traces.clear();
    this.spansSinceExport = [];
    this.baseline.clear();
    this.retentionPolicy.reset();
    this.contentSpanIds.clear();
  }

  // Load historical telemetry
  async loadHistory(): Promise<TelemetryMetrics[]> {
    try {
      const files = await readdir(this.config.exportDir);
      const metrics: TelemetryMetrics[] = [];
      
      for (const file of files.filter((f: string) => f.startsWith('telemetry-') && f.endsWith('.json'))) {
        const content = await readFile(join(this.config.exportDir, file), 'utf-8');
        const data = JSON.parse(content);
        metrics.push(data.metrics);
      }
      
      return metrics;
    } catch (error) {
      const failure = classifyFailure(error);
      console.error(`[TelemetryCollector] Load history failed: [${failure.kind}] ${failure.reason} — ${failure.nextStep}`);
      return [];
    }
  }

  // Get trace by ID
  async getTrace(traceId: string): Promise<TelemetrySpan[]> {
    if (this.persistence) {
      const store = await this.persistence.getTelemetryStore();
      const spans = await store.getTrace(traceId);
      return spans.map(s => ({ ...s, status: s.status as "ok" | "error" }));
    }
    return this.traces.get(traceId) || [];
  }

  // Get span by ID
  getSpan(spanId: string): TelemetrySpan | undefined {
    return this.spanMap.get(spanId);
  }

  private getTraceId(spanId: string): string {
    const span = this.spanMap.get(spanId);
    return span?.traceId || randomUUID();
  }

  // Clear old spans (for memory management)
  clearOldSpans(maxAgeMs: number = 3600000): void {
    const cutoff = Date.now() - maxAgeMs;
    for (const [spanId, span] of this.spanMap) {
      if (span.startTime <= cutoff) {
        this.spanMap.delete(spanId);
        this.contentSpanIds.delete(spanId);
      }
    }
    for (const [traceId, traceSpans] of this.traces) {
      const remaining = traceSpans.filter(s => s.startTime > cutoff);
      if (remaining.length === 0) this.traces.delete(traceId);
      else this.traces.set(traceId, remaining);
    }
  }
}

// Telemetry Server for MCP integration
export class TelemetryServer {
  private collector: TelemetryCollector;

  constructor(collector: TelemetryCollector) {
    this.collector = collector;
  }

  // Handle MCP tool calls
  async handleToolCall(tool: string, args: Record<string, unknown>): Promise<unknown> {
    switch (tool) {
      case 'record_agent_turn':
        return this.collector.recordAgentTurn(
          args.agentId as string,
          args.model as string,
          args.inputTokens as number,
          args.outputTokens as number,
          args.cost as number,
          args.content as { prompt?: import('../types.js').LLMPrompt; response?: import('../types.js').LLMResponse } | undefined
        );

      case 'record_sub_agent':
        return this.collector.recordSubAgent(
          args.parentSpanId as string,
          args.childAgentId as string,
          args.model as string,
          args.content as { prompt?: import('../types.js').LLMPrompt; response?: import('../types.js').LLMResponse } | undefined
        );

      case 'record_tool_call':
        return this.collector.recordToolCall(
          args.toolName as string,
          args.input,
          args.output,
          args.duration as number,
          args.success as boolean
        );

      case 'record_handoff':
        return this.collector.recordHandoff(
          args.fromAgent as string,
          args.toAgent as string,
          args.contextSize as number
        );

      case 'get_metrics':
        return this.collector.getMetrics();

      case 'detect_stuck':
        return { stuck: this.collector.detectStuckLoop(args.toolName as string, args.threshold as number) };

      case 'export':
        await this.collector.export();
        return { exported: true };

      case 'export_deep_learning': {
        const count = await this.collector.exportDeepLearning(args.outputPath as string | undefined);
        return { exported: true, records: count };
      }

      default:
        throw new Error(`Unknown tool: ${tool}`);
    }
  }

  // Handle MCP resource reads
  async handleResourceRead(uri: string): Promise<string> {
    if (uri === 'telemetry://metrics') {
      return JSON.stringify(this.collector.getMetrics(), null, 2);
    }
    throw new Error(`Unknown resource: ${uri}`);
  }
}
