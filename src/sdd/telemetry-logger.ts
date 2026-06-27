// Vibemate SDD — Telemetry Logger

export interface TelemetryEvent {
  type: 'phase_start' | 'phase_complete' | 'phase_failed' | 'decision' | 'metric' | 'violation' | 'user_action';
  phase?: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

const logs: TelemetryEvent[] = [];

export function logEvent(event: TelemetryEvent): void {
  logs.push({
    ...event,
    timestamp: event.timestamp || Date.now(),
  });
}

export function logPhase(
  phase: string,
  status: 'start' | 'complete' | 'failed',
  detail?: string
): void {
  const message = detail
    ? `Phase ${phase} ${status}: ${detail}`
    : `Phase ${phase} ${status}`;
  
  logEvent({
    type: status === 'start' ? 'phase_start' : status === 'complete' ? 'phase_complete' : 'phase_failed',
    phase,
    message,
    timestamp: Date.now(),
  });
}

export function logDecision(
  decision: string,
  rationale: string,
  evidence?: Record<string, unknown>
): void {
  logEvent({
    type: 'decision',
    message: `Decision: ${decision} — ${rationale}`,
    metadata: { decision, rationale, evidence },
    timestamp: Date.now(),
  });
}

export function logMetric(
  name: string,
  value: number,
  unit: string
): void {
  logEvent({
    type: 'metric',
    message: `Metric: ${name} = ${value} ${unit}`,
    metadata: { name, value, unit },
    timestamp: Date.now(),
  });
}

export function logViolation(
  ruleId: string,
  severity: string,
  message: string
): void {
  logEvent({
    type: 'violation',
    message: `Violation [${severity}]: ${message}`,
    metadata: { ruleId, severity },
    timestamp: Date.now(),
  });
}

export function logUserAction(
  action: string,
  detail?: string
): void {
  logEvent({
    type: 'user_action',
    message: detail ? `User: ${action} — ${detail}` : `User: ${action}`,
    timestamp: Date.now(),
  });
}

export function getLogs(phase?: string): TelemetryEvent[] {
  if (phase) {
    return logs.filter(l => l.phase === phase);
  }
  return [...logs];
}

export function clearLogs(): void {
  logs.length = 0;
}
