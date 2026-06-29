import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

export interface AuditEntry {
  id: string;
  timestamp: string;
  type: 'agent_turn' | 'tool_call' | 'phase_transition' | 'handoff' | 'sub_agent' | 'failure';
  agentId?: string;
  phase?: string;
  model?: string;
  provider?: string;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
  durationMs?: number;
  success?: boolean;
  metadata: Record<string, unknown>;
}

const DURATION_RE = /^(\d+)(d|h|m|s)$/;
const DURATION_MS: Record<string, number> = { d: 864e5, h: 36e5, m: 6e4, s: 1e3 };

export function parseSince(s: string): Date {
  const m = DURATION_RE.exec(s);
  if (!m) throw new Error(`Invalid duration: "${s}". Expected format: 7d, 24h, 30m, 60s`);
  return new Date(Date.now() - parseInt(m[1], 10) * DURATION_MS[m[2]]);
}

interface RawSpan {
  spanId: string;
  traceId: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, unknown>;
}

interface TelemetryFile {
  spans: RawSpan[];
}

interface PhaseObservation {
  phase: string;
  durationMs: number;
  errorCount: number;
  observationScore?: number;
  timestamp: string;
  observationId: string;
  circuitBreakerState?: { totalCost?: number };
}

interface StateFile {
  observations?: PhaseObservation[];
}

let _seq = 0;
function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(++_seq).toString(36)}`;
}

function spanToEntry(span: RawSpan): AuditEntry | null {
  const attr = span.attributes;
  const ts = new Date(span.startTime).toISOString();
  const dur = span.endTime ? span.endTime - span.startTime : undefined;

  switch (span.name) {
    case 'agent.turn':
      return {
        id: uid('at'),
        timestamp: ts,
        type: 'agent_turn',
        agentId: attr['agent.id'] as string | undefined,
        model: attr['agent.model'] as string | undefined,
        provider: attr['gen_ai.provider'] as string | undefined,
        inputTokens: attr['llm.input_tokens'] as number | undefined,
        outputTokens: attr['llm.output_tokens'] as number | undefined,
        cost: attr['llm.cost'] as number | undefined,
        durationMs: dur,
        success: true,
        metadata: { spanId: span.spanId, traceId: span.traceId },
      };

    case 'tool.call':
      return {
        id: uid('tc'),
        timestamp: ts,
        type: 'tool_call',
        durationMs: attr['tool.duration'] as number | undefined ?? dur,
        success: attr['tool.success'] as boolean | undefined,
        metadata: {
          spanId: span.spanId,
          traceId: span.traceId,
          toolName: attr['tool.name'],
        },
      };

    case 'agent.handoff':
      return {
        id: uid('hf'),
        timestamp: ts,
        type: 'handoff',
        durationMs: dur,
        metadata: {
          spanId: span.spanId,
          traceId: span.traceId,
          fromAgent: attr['handoff.from'],
          toAgent: attr['handoff.to'],
          contextSize: attr['handoff.context_size'],
        },
      };

    case 'agent.sub_agent':
      return {
        id: uid('sa'),
        timestamp: ts,
        type: 'sub_agent',
        model: attr['agent.model'] as string | undefined,
        provider: attr['gen_ai.provider'] as string | undefined,
        durationMs: dur,
        metadata: {
          spanId: span.spanId,
          traceId: span.traceId,
          parentAgentId: attr['agent.parent_id'],
          childAgentId: attr['agent.child_id'],
        },
      };

    case 'agent.failure':
      return {
        id: uid('fl'),
        timestamp: ts,
        type: 'failure',
        durationMs: dur,
        success: false,
        metadata: {
          spanId: span.spanId,
          traceId: span.traceId,
          errorKind: attr['error.kind'],
          errorMessage: attr['error.message'],
        },
      };

    default:
      return null;
  }
}

export class AuditExporter {
  constructor(private vibeDir: string) {}

  async loadEntries(since?: Date): Promise<AuditEntry[]> {
    const entries: AuditEntry[] = [];

    // 1. Read telemetry JSON files
    try {
      const files = await readdir(this.vibeDir);
      const telemetryFiles = files.filter(f => f.startsWith('telemetry-') && f.endsWith('.json'));
      for (const file of telemetryFiles) {
        try {
          const raw = await readFile(join(this.vibeDir, file), 'utf-8');
          const data = JSON.parse(raw) as TelemetryFile;
          if (!Array.isArray(data.spans)) continue;
          for (const span of data.spans) {
            const entry = spanToEntry(span);
            if (entry) entries.push(entry);
          }
        } catch { /* skip malformed file */ }
      }
    } catch { /* dir missing */ }

    // 2. Read phase observations from state.json
    try {
      const raw = await readFile(join(this.vibeDir, 'state.json'), 'utf-8');
      const state = JSON.parse(raw) as StateFile;
      for (const obs of state.observations ?? []) {
        entries.push({
          id: uid('pt'),
          timestamp: obs.timestamp,
          type: 'phase_transition',
          phase: obs.phase,
          durationMs: obs.durationMs,
          cost: obs.circuitBreakerState?.totalCost,
          success: obs.errorCount === 0,
          metadata: {
            observationId: obs.observationId,
            observationScore: obs.observationScore,
            errorCount: obs.errorCount,
          },
        });
      }
    } catch { /* state.json missing or malformed */ }

    // 3. Filter by since, sort by timestamp ascending
    const filtered = since
      ? entries.filter(e => new Date(e.timestamp) >= since)
      : entries;

    filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    return filtered;
  }

  toJSONL(entries: AuditEntry[]): string {
    return entries.map(e => JSON.stringify(e)).join('\n');
  }

  toJSON(entries: AuditEntry[]): string {
    return JSON.stringify(entries, null, 2);
  }
}
