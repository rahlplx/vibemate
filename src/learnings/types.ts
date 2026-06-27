import { z } from "zod"

export const RepoConfigSchema = z.object({
  url: z.string().url(),
  branch: z.string().optional(),
  depth: z.number().default(1),
  installCmd: z.string().optional(),
  buildCmd: z.string().optional(),
  testCmd: z.string().optional(),
  runCmd: z.string().optional(),
  timeout: z.number().default(300_000),
})

export type RepoConfig = z.infer<typeof RepoConfigSchema>

export interface CloneResult {
  path: string
  branch: string
  commitHash: string
  commitMessage: string
  fileCount: number
  languages: Record<string, number>
  packageManager: string | null
  hasTests: boolean
  hasCI: boolean
  setupDuration: number
}

export interface InstrumentResult {
  traces: TraceEntry[]
  logs: LogEntry[]
  metrics: RawMetrics
  duration: number
}

export interface TraceEntry {
  timestamp: number
  level: "info" | "warn" | "error" | "debug"
  source: string
  message: string
  data?: Record<string, unknown>
}

export interface LogEntry {
  timestamp: number
  source: string
  stream: "stdout" | "stderr"
  line: string
}

export interface RawMetrics {
  buildTime: number | null
  testCount: number
  testPass: number
  testFail: number
  testSkip: number
  lintErrors: number
  typeErrors: number
  fileCount: number
  totalLOC: number
  avgFileLength: number
  maxFileLength: number
  dependencyCount: number
  devDependencyCount: number
  circularDeps: string[]
  exportedSymbols: number
  importedSymbols: number
}

export interface ExtractedData {
  metrics: RawMetrics
  architecture: ArchitectureData
  patterns: PatternData
  quality: QualityData
  dependencies: DependencyData
  monorepo?: {
    isMonorepo: boolean
    tool: string | null
    packageCount: number
  }
  apiSurface?: {
    totalExports: number
    jsdocCoverage: number
    exportedTypes: number
    exportedFunctions: number
  }
  asyncPatterns?: string[]
  security?: {
    apiKeyHandling: boolean
    envVarUsage: string[]
    authPatterns: string[]
  }
  testOrg?: {
    totalTestFiles: number
    testCategories: string[]
    hasUnitTests: boolean
    hasIntegrationTests: boolean
    testFramework: string | null
  }
}

export interface ArchitectureData {
  moduleCount: number
  avgModuleSize: number
  maxModuleDepth: number
  entryPoints: string[]
  circularDependencies: string[]
  layerViolations: string[]
  adapterPatterns: string[]
  diContainers: string[]
}

export interface PatternData {
  designPatterns: DetectedPattern[]
  antiPatterns: DetectedPattern[]
  codingStyle: StyleProfile
  conventions: string[]
}

export interface DetectedPattern {
  name: string
  type: "design" | "anti" | "architectural" | "testing"
  locations: FileLocation[]
  confidence: number
  description: string
}

export interface FileLocation {
  file: string
  line: number
  column?: number
}

export interface StyleProfile {
  indentStyle: "spaces" | "tabs"
  indentSize: number
  lineWidth: number
  quoteStyle: "single" | "double"
  semicolons: boolean
  namingConvention: string
}

export interface QualityData {
  testCoverage: number | null
  testToSourceRatio: number
  assertionDensity: number
  errorHandling: "typed" | "generic" | "mixed"
  documentationCoverage: number
  typeCoverage: number
  complexityScore: number
}

export interface DependencyData {
  direct: DependencyInfo[]
  dev: DependencyInfo[]
  outdated: string[]
  vulnerable: string[]
  unused: string[]
  bundled: boolean
}

export interface DependencyInfo {
  name: string
  version: string
  license: string
  size: number | null
}

export interface AuditFinding {
  id: string
  severity: "critical" | "high" | "medium" | "low" | "info"
  category: string
  title: string
  description: string
  evidence: string[]
  recommendation: string
  effort: "trivial" | "easy" | "medium" | "hard" | "epic"
  impact: "high" | "medium" | "low"
}

export interface ValueAssessment {
  overallScore: number
  dimensions: Record<string, number>
  strengths: string[]
  weaknesses: string[]
  opportunities: string[]
  threats: string[]
  roiEstimate: {
    developmentHours: number
    maintenanceMultiplier: number
    reusePotential: number
  }
}

export interface MetaLearning {
  id: string
  category: "architecture" | "testing" | "tooling" | "process" | "patterns"
  insight: string
  evidence: string[]
  confidence: number
  applicableTo: string[]
  source: string
}

export interface RLSignal {
  id: string
  action: string
  reward: number
  context: string
  outcome: string
  learnings: string[]
}

export interface SpecPlan {
  id: string
  title: string
  description: string
  slices: PlanSlice[]
  estimatedEffort: number
  priority: number
  dependencies: string[]
}

export interface PlanSlice {
  id: string
  title: string
  description: string
  tasks: PlanTask[]
  estimatedHours: number
  risk: "low" | "medium" | "high"
}

export interface PlanTask {
  id: string
  description: string
  type: "tdd" | "implement" | "refactor" | "test" | "docs"
  estimatedMinutes: number
  dependencies: string[]
  acceptanceCriteria: string[]
}

export interface PipelineState {
  repo: RepoConfig | null
  clone: CloneResult | null
  instrument: InstrumentResult | null
  extract: ExtractedData | null
  audit: AuditFinding[]
  value: ValueAssessment | null
  patterns: DetectedPattern[]
  meta: MetaLearning[]
  rl: RLSignal[]
  plan: SpecPlan | null
  startTime: number
  endTime: number | null
  errors: string[]
}
