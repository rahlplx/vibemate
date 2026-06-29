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

// LLM content types for deep-learning capture
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
}

// Schema for a single tool made available to the model in a call
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };
}

export interface LLMPrompt {
  system?: string;
  messages: LLMMessage[];
  tools?: ToolDefinition[];
}

export interface LLMResponse {
  content: string;
  thinking?: string;
  stopReason?: string;
}

// Model sampling/generation hyperparameters — needed for reproducibility in fine-tuning
export interface InferenceParams {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

export interface ToolCallContent {
  name: string;
  input: unknown;
  output: unknown;
  duration: number;
  success: boolean;
}

export interface SubAgentContent {
  agentId: string;
  model: string;
  prompt?: LLMPrompt;
  response?: LLMResponse;
}

// Stored in .vibe/traces/<spanId>.json — full content separate from span metadata
export interface SpanContent {
  spanId: string;
  traceId: string;
  name: string;
  timestamp: string;
  prompt?: LLMPrompt;
  response?: LLMResponse;
  inferenceParams?: InferenceParams;
  toolCalls: ToolCallContent[];
  subAgents: SubAgentContent[];
  metadata: Record<string, unknown>;
}

// One row in the JSONL deep-learning export
export interface DeepLearningRecord {
  id: string;
  timestamp: string;
  type: 'agent_turn' | 'sub_agent' | 'tool_call' | 'handoff' | 'bash_execution' | 'failure';
  prompt?: LLMPrompt;
  response?: LLMResponse;
  inferenceParams?: InferenceParams;
  toolCalls?: ToolCallContent[];
  subAgents?: SubAgentContent[];
  metadata: {
    model?: string;
    agentId?: string;
    phase?: string;
    inputTokens?: number;
    outputTokens?: number;
    cost?: number;
    inputCost?: number;
    outputCost?: number;
    success?: boolean;
    traceId?: string;
    provider?: string;
    modelFamily?: string;
    agentType?: string;
    latencyMs?: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
    // bash_execution fields
    command?: string;
    exitCode?: number;
    // failure fields
    errorKind?: string;
    errorMessage?: string;
    [key: string]: unknown;
  };
}

export interface AgentTurn extends TelemetrySpan {
  agentId: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
  cost: number;
}

export interface SubAgentSpan extends TelemetrySpan {
  parentAgentId: string;
  childAgentId: string;
  model: string;
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
  | 'build' | 'critique' | 'harness' | 'review' | 'qa'
  | 'ship' | 'retro' | 'learn' | 'done';

export interface PhaseObservation {
  phase: AutoPhase;
  durationMs: number;
  tokenCost: number;
  errorCount: number;
  circuitBreakerState: {
    consecutiveFailures: number;
    dispatchCount: number;
    totalCost: number;
  };
  observationScore: number;
  timestamp: string;
  observationId: string;
}

export interface AutoState {
  phase: AutoPhase;
  step: string;
  completed: string[];
  agent: AgentType;
  hasUI: boolean;
  mode: 'guided' | 'auto' | 'quick';
  telemetry: boolean;
  artifacts: Record<string, string>;
  sessionId?: string;
  agentId?: string;
  harnessRetried?: boolean;
  routerDowngrade?: boolean;
  observations?: PhaseObservation[];
  /** Routing tier override derived from EvolveAgent skill recommendation */
  skillTierOverride?: 'escalate' | 'downgrade' | null;
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
  contextWindow?: number;
  phase?: AutoPhase;
  observationScore?: number;
}

// ─── Prompt System Types ──────────────────────────────────────────────────────

export type PromptCategory = 'role' | 'domain' | 'framework' | 'security' | 'testing' | 'evolved' | 'org';
export type PromptSource = 'built-in' | 'user' | 'org' | 'mined' | 'evolved';

export interface PromptTemplate {
  id: string;
  name: string;
  category: PromptCategory;
  content: string;
  version: string;
  source: PromptSource;
  confidence: number;      // 0-1; evolved prompts start at 0.5
  tags: string[];
  usageCount: number;
  successRate: number;     // 0-1; updated by evolver from phase observations
  minedFrom?: string;      // source URL when source='mined'
  evolvedFrom?: string;    // parent template id when source='evolved'
}

export interface PromptOutcome {
  templateId: string;
  phase: string;
  outcome: 'success' | 'failure';
  retryCount: number;
  durationMs: number;
  timestamp: string;
}

export interface ComposedPrompt {
  systemPrompt: string;
  activeTemplateIds: string[];
  phaseOverride?: string;
}

// Harness Types
export type HarnessCheckStatus = 'pass' | 'fail' | 'warn' | 'skip';

export interface HarnessCheck {
  name: string;
  status: HarnessCheckStatus;
  message: string;
  duration: number;
}

export type CritiqueLens = 'edge_cases' | 'security' | 'cleanup' | 'invariants' | 'coverage_gaps';
export type FindingSeverity = 'critical' | 'high' | 'medium' | 'low';
export type FindingCategory = 'edge_case' | 'security' | 'cleanup' | 'invariant' | 'coverage' | 'synthetic';
export type CritiqueVerdict = 'pass' | 'warn' | 'fail';

export interface CritiqueFinding {
  lens: CritiqueLens;
  category: FindingCategory;
  severity: FindingSeverity;
  message: string;
  line?: number;
}

export interface CritiqueReport {
  timestamp: string;
  findings: CritiqueFinding[];
  score: number;
  verdict: CritiqueVerdict;
  blocksHarness: boolean;
  summary: string;
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
