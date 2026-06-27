// Core types for Vibemate unified plugin platform

// Agent Types
export type AgentType = 'claude-code' | 'opencode' | 'cursor' | 'codex' | 'kilocode' | 'antigravity' | 'openhands' | 'unknown';

export interface AgentConfig {
  type: AgentType;
  pathPrefix: string;
  nonInteractiveFlag: string;
  skillDir: string;
  configFiles: string[];
}

// OKF Types (Open Knowledge Format v0.1)
export interface OKFFrontmatter {
  type: string;
  title?: string;
  description?: string;
  resource?: string;
  tags?: string[];
  timestamp?: string;
  [key: string]: unknown;
}

export interface OKFConcept {
  path: string;
  frontmatter: OKFFrontmatter;
  body: string;
}

export interface OKFBundle {
  root: string;
  version: string;
  concepts: OKFConcept[];
  index?: OKFConcept;
  log?: OKFConcept;
}

// MCP Types
export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  version: string;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

// Context Engineering Types
export interface ASTExtraction {
  filePath: string;
  relevantCode: string;
  tokenReduction: number;
}

export interface CompressionResult {
  original: string;
  compressed: string;
  reductionPercent: number;
}

export interface DLPMask {
  pattern: RegExp;
  replacement: string;
}

export interface CacheEntry {
  key: string;
  content: string;
  hash: string;
  timestamp: number;
}

// Telemetry Types (OTel + ATSC)
export interface TelemetrySpan {
  name: string;
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, unknown>;
  status: 'ok' | 'error';
}

export interface AgentTurn extends TelemetrySpan {
  agentId: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  cost: number;
}

export interface ToolCall extends TelemetrySpan {
  toolName: string;
  input: unknown;
  output: unknown;
  duration: number;
}

export interface HandoffSpan extends TelemetrySpan {
  fromAgent: string;
  toAgent: string;
  contextSize: number;
}

export interface TelemetryMetrics {
  totalTokens: number;
  totalCost: number;
  averageLatency: number;
  errorRate: number;
  toolFailureRate: number;
  stuckDetections: number;
}

// Self-Improvement Types
export interface RetroLearning {
  id: string;
  timestamp: string;
  type: 'success' | 'failure' | 'anti-pattern';
  description: string;
  lesson: string;
  tags: string[];
  utilityScore: number;
}

export interface EvolveRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  qualityScore: number;
  lastUsed: string;
  useCount: number;
}

export interface ExperiencePrinciple {
  id: string;
  principle: string;
  context: string;
  effectiveness: number;
  usageCount: number;
  lastUsed: string;
}

// Auto-Mode Types
export type AutoPhase = 
  | 'think' | 'plan' | 'design' | 'break' 
  | 'build' | 'harness' | 'review' | 'qa' 
  | 'ship' | 'retro' | 'learn' | 'done';

export interface AutoState {
  phase: AutoPhase;
  step: string;
  completed: string[];
  agent: AgentType;
  hasUI: boolean;
  mode: 'guided' | 'auto' | 'quick';
  telemetry: boolean;
  artifacts: Record<string, string>;
}

export interface CircuitBreaker {
  consecutiveFailures: number;
  dispatchCount: number;
  totalCost: number;
  maxFailures: number;
  maxDispatches: number;
  maxBudget: number;
}

// Router Types
export type ComplexityLevel = 'low' | 'medium' | 'high';

export interface RoutingDecision {
  level: ComplexityLevel;
  model: string;
  provider: string;
  estimatedCost: number;
  reason: string;
}

// Harness Types
export type HarnessCheckStatus = 'pass' | 'fail' | 'warn' | 'skip';

export interface HarnessCheck {
  name: string;
  status: HarnessCheckStatus;
  message: string;
  duration: number;
}

export interface HarnessReport {
  timestamp: string;
  checks: HarnessCheck[];
  pass: number;
  fail: number;
  warn: number;
  skip: number;
  overall: 'pass' | 'fail';
}

// Compiler Types
export interface CompiledArtifacts {
  agent: AgentType;
  skills: string[];
  config: string;
  context: string;
  hooks: string[];
}

// Vibemate Config
export interface VibemateConfig {
  version: string;
  agents: AgentType[];
  okfBundlePath: string;
  mcpConfigPath: string;
  telemetryEnabled: boolean;
  evolutionCadence: 'task' | 'daily' | 'weekly';
  cloudProviders: CloudProvider[];
  budget: number;
}

export interface CloudProvider {
  name: string;
  apiKey: string;
  models: string[];
  maxTokens: number;
  costPer1kTokens: number;
}

export interface LSPConfig {
  name: string;
  command: string;
  args: string[];
  language: string;
  installCmd?: string;
}

export interface LoopReport {
  detected: boolean;
  cycle: string[];
  frequency: number;
  severity: 'rapid' | 'normal' | 'slow';
  parentPhase?: string;
}

export interface AnomalyEvent {
  spanId: string;
  spanName: string;
  type: 'latency_spike' | 'error_surge' | 'throughput_drop';
  zScore: number;
  severity: 'warning' | 'critical';
  detectedAt: number;
}
