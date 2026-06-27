export { createPipeline } from "./orchestrator"
export { cloneRepo } from "./clone"
export { instrument } from "./instrument"
export { extractData } from "./extract"
export { audit, assessValue } from "./analyze"
export { findPatterns, summarizePatterns } from "./patterns"
export { generateMetaLearnings } from "./meta"
export { generateRLSignals } from "./rl"
export { generateSpec, formatPlan } from "./generator"
export {
  assessMaturity,
  computeAdaptiveThresholds,
  ensembleVote,
  stratifyDifficulty,
  reflectOnAnalysis,
  applyConfidenceDecay,
  runCognitiveAssessment,
  DEFAULT_COGNITIVE_CONFIG,
} from "./cognitive"
export type {
  CognitiveConfig,
  ProjectMaturity,
  EnsembleResult,
  EnsembleFinding,
  DetectorVote,
  AdaptiveThresholds,
  DifficultyItem,
  Reflection,
  CognitiveAssessment,
} from "./cognitive"
export type {
  RepoConfig,
  CloneResult,
  InstrumentResult,
  TraceEntry,
  LogEntry,
  RawMetrics,
  ExtractedData,
  ArchitectureData,
  PatternData,
  QualityData,
  DependencyData,
  DetectedPattern,
  FileLocation,
  StyleProfile,
  AuditFinding,
  ValueAssessment,
  MetaLearning,
  RLSignal,
  SpecPlan,
  PlanSlice,
  PlanTask,
  PipelineState,
} from "./types"
