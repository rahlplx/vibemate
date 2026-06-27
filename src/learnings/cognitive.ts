import type { ExtractedData, AuditFinding, RLSignal, MetaLearning } from "./types"

/**
 * Cognitive adaptivity module.
 *
 * Implements:
 * - Ensemble voting: multiple detectors vote on findings, false positives dropped
 * - Adaptive thresholds: detector sensitivity scales with project maturity
 * - Confidence calibration: RL signals adjust future detector confidence
 * - Difficulty stratification: focus analysis on hardest problems first
 * - Kolb learning loop: reflect on analysis quality, improve next cycle
 * - Ebbinghaus memory decay with spaced repetition
 * - Multi-detector ensemble (patterns, security, async voters)
 */

// --- Types ---

export interface CognitiveConfig {
  ensembleThreshold: number       // min votes (0-1) to confirm a finding
  confidenceDecayRate: number     // how fast confidence decays over time (Ebbinghaus)
  maturityMinFiles: number        // minimum files to consider "mature"
  minConfidenceForAction: number  // confidence below this → skip
}

export interface MemoryEntry {
  id: string
  finding: string
  initialConfidence: number
  currentConfidence: number
  strength: number
  reviewCount: number
  lastReviewedCycle: number
  reviewHistory: ReviewRecord[]
}

export interface ReviewRecord {
  cycle: number
  confirmed: boolean
  confidenceAtReview: number
}

export interface DifficultyPlan {
  priority: number
  hardProblems: DifficultyItem[]
  recommendedApproach: "maintain" | "improve" | "refactor" | "rewrite"
}

export const DEFAULT_COGNITIVE_CONFIG: CognitiveConfig = {
  ensembleThreshold: 0.4,
  confidenceDecayRate: 0.3,
  maturityMinFiles: 50,
  minConfidenceForAction: 0.3,
}

export interface DetectorVote {
  detector: string
  finding: string
  severity: "critical" | "high" | "medium" | "low" | "info"
  confidence: number
  evidence: string[]
}

export interface EnsembleResult {
  confirmed: EnsembleFinding[]
  rejected: DetectorVote[]
  confidence: number
}

export interface EnsembleFinding {
  finding: string
  severity: "critical" | "high" | "medium" | "low" | "info"
  votes: DetectorVote[]
  confidence: number
  evidence: string[]
}

export interface ProjectMaturity {
  score: number       // 0-1
  factors: string[]
  tier: "greenfield" | "growing" | "mature" | "enterprise"
}

export interface CognitiveAssessment {
  maturity: ProjectMaturity
  ensemble: EnsembleResult
  adaptiveThresholds: AdaptiveThresholds
  difficultyMap: DifficultyItem[]
  reflections: Reflection[]
}

export interface AdaptiveThresholds {
  godFileLines: number
  maxNesting: number
  testToSourceMin: number
  docCoverageMin: number
  complexityScoreMax: number
}

export interface DifficultyItem {
  area: string
  difficulty: number  // 0-1
  reason: string
  recommendation: string
}

export interface Reflection {
  aspect: string
  observation: string
  insight: string
  action: string
  confidence: number
}

// --- Project Maturity Detection ---

export function assessMaturity(data: ExtractedData): ProjectMaturity {
  const factors: string[] = []
  let score = 0

  const fileCount = data.metrics.fileCount || 0
  if (fileCount >= 100) { score += 0.25; factors.push(`${fileCount} files (large)`) }
  else if (fileCount >= 50) { score += 0.15; factors.push(`${fileCount} files (medium)`) }
  else { factors.push(`${fileCount} files (small)`) }

  if (data.monorepo?.isMonorepo) { score += 0.2; factors.push(`monorepo (${data.monorepo.packageCount} packages)`) }

  if (data.testOrg?.totalTestFiles && data.testOrg.totalTestFiles > 20) {
    score += 0.2; factors.push(`${data.testOrg.totalTestFiles} test files`)
  }

  if (data.patterns.conventions.length >= 5) {
    score += 0.15; factors.push(`${data.patterns.conventions.length} conventions configured`)
  }

  if (data.quality.documentationCoverage > 0.5) {
    score += 0.1; factors.push(`doc coverage ${(data.quality.documentationCoverage * 100).toFixed(0)}%`)
  }

  if (data.apiSurface?.totalExports && data.apiSurface.totalExports > 50) {
    score += 0.1; factors.push(`${data.apiSurface.totalExports} exports (library)`)
  }

  let tier: ProjectMaturity["tier"] = "greenfield"
  if (score >= 0.8) tier = "enterprise"
  else if (score >= 0.6) tier = "mature"
  else if (score >= 0.35) tier = "growing"

  return { score: Math.min(1, score), factors, tier }
}

// --- Adaptive Thresholds ---

export function computeAdaptiveThresholds(maturity: ProjectMaturity): AdaptiveThresholds {
  const m = maturity.score

  return {
    godFileLines: Math.round(300 + m * 400),
    maxNesting: Math.round(3 + m * 4),
    testToSourceMin: 0.2 + m * 0.3,
    docCoverageMin: 0.3 + m * 0.4,
    complexityScoreMax: Math.round(3 + m * 10),
  }
}

// --- Ensemble Voting ---

export function ensembleVote(votes: DetectorVote[], config: CognitiveConfig = DEFAULT_COGNITIVE_CONFIG): EnsembleResult {
  const grouped = new Map<string, DetectorVote[]>()
  for (const v of votes) {
    const key = v.finding.toLowerCase()
    const existing = grouped.get(key) || []
    existing.push(v)
    grouped.set(key, existing)
  }

  const confirmed: EnsembleFinding[] = []
  const rejected: DetectorVote[] = []

  for (const [, group] of grouped) {
    const totalConf = group.reduce((s, v) => s + v.confidence, 0) / group.length
    const avgSeverity = worstSeverity(group.map(v => v.severity))
    const allEvidence = [...new Set(group.flatMap(v => v.evidence))]

    if (totalConf >= config.ensembleThreshold && group.length >= 1) {
      confirmed.push({
        finding: group[0].finding,
        severity: avgSeverity,
        votes: group,
        confidence: totalConf,
        evidence: allEvidence,
      })
    } else {
      rejected.push(...group)
    }
  }

  confirmed.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))

  const avgConf = confirmed.length > 0
    ? confirmed.reduce((s, f) => s + f.confidence, 0) / confirmed.length
    : 0

  return { confirmed, rejected, confidence: avgConf }
}

// --- Difficulty Stratification ---

export function stratifyDifficulty(data: ExtractedData): DifficultyItem[] {
  const items: DifficultyItem[] = []

  if (data.quality.complexityScore > 5) {
    items.push({
      area: "complexity",
      difficulty: Math.min(1, data.quality.complexityScore / 15),
      reason: `Complexity score ${data.quality.complexityScore} indicates tangled logic`,
      recommendation: "Break down god files, extract pure functions, add type guards",
    })
  }

  if (data.quality.errorHandling === "generic") {
    items.push({
      area: "error-handling",
      difficulty: 0.7,
      reason: "Generic catch blocks hide error types",
      recommendation: "Create typed error hierarchy, use exhaustive catch with Zod",
    })
  }

  if (data.quality.testToSourceRatio < 0.2) {
    items.push({
      area: "test-coverage",
      difficulty: 0.6,
      reason: `Test/source ratio ${(data.quality.testToSourceRatio * 100).toFixed(0)}% is low`,
      recommendation: "Add integration tests, use TDD for new features",
    })
  }

  if (data.quality.documentationCoverage < 0.3) {
    items.push({
      area: "documentation",
      difficulty: 0.4,
      reason: `Only ${(data.quality.documentationCoverage * 100).toFixed(0)}% of exports documented`,
      recommendation: "Add JSDoc to public API, generate API docs",
    })
  }

  if (data.architecture.layerViolations.length > 0) {
    items.push({
      area: "architecture",
      difficulty: 0.8,
      reason: `${data.architecture.layerViolations.length} layer violations`,
      recommendation: "Enforce dependency direction, extract adapters",
    })
  }

  if (data.dependencies.unused.length > 3) {
    items.push({
      area: "dependencies",
      difficulty: 0.3,
      reason: `${data.dependencies.unused.length} unused dependencies`,
      recommendation: "Remove unused deps to reduce bundle and attack surface",
    })
  }

  items.sort((a, b) => b.difficulty - a.difficulty)
  return items
}

// --- Kolb Reflection Loop ---

export function reflectOnAnalysis(
  data: ExtractedData,
  audit: AuditFinding[],
  rl: RLSignal[],
  prevReflections: Reflection[] = [],
): Reflection[] {
  const reflections: Reflection[] = []

  const totalFindings = audit.length
  const criticalCount = audit.filter(f => f.severity === "critical").length

  if (totalFindings === 0) {
    reflections.push({
      aspect: "detection-coverage",
      observation: "No findings detected — analysis may be too lenient",
      insight: "Zero findings could indicate mature codebase OR insufficient detection",
      action: "Cross-validate with manual review; check detector sensitivity",
      confidence: 0.5,
    })
  }

  if (criticalCount > 3) {
    reflections.push({
      aspect: "severity-calibration",
      observation: `${criticalCount} critical findings — may indicate threshold too aggressive`,
      insight: "High critical count dilutes urgency; true critical issues are rare",
      action: "Review critical detection rules; consider upgrading some to high",
      confidence: 0.6,
    })
  }

  const negativeRl = rl.filter(r => r.reward < 0)
  if (negativeRl.length > rl.length * 0.5) {
    reflections.push({
      aspect: "quality-trend",
      observation: `${negativeRl.length}/${rl.length} negative RL signals`,
      insight: "Majority negative signals indicate codebase needs significant improvement",
      action: "Prioritize high-impact fixes; consider phased approach",
      confidence: 0.7,
    })
  }

  if (data.quality.testToSourceRatio < 0.1 && data.metrics.fileCount > 20) {
    reflections.push({
      aspect: "testing-maturity",
      observation: "Very low test ratio for project size",
      insight: "Untested code compounds risk; TDD adoption is highest-leverage intervention",
      action: "Start with critical paths; add test infrastructure first",
      confidence: 0.8,
    })
  }

  const prevAspects = new Set(prevReflections.map(r => r.aspect))
  for (const r of reflections) {
    if (prevAspects.has(r.aspect)) {
      r.confidence = Math.min(1, r.confidence + 0.1)
    }
  }

  return reflections
}

// --- Confidence Decay (Ebbinghaus) ---

export function applyConfidenceDecay(
  confidence: number,
  cyclesSinceLastUse: number,
  config: CognitiveConfig = DEFAULT_COGNITIVE_CONFIG,
): number {
  const r = config.confidenceDecayRate
  return confidence * Math.exp(-r * cyclesSinceLastUse)
}

// --- Ebbinghaus Memory Decay ---

export function createMemoryEntry(finding: string, confidence: number, cycle: number): MemoryEntry {
  return {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    finding,
    initialConfidence: confidence,
    currentConfidence: confidence,
    strength: 0,
    reviewCount: 0,
    lastReviewedCycle: cycle,
    reviewHistory: [],
  }
}

export function computeMemoryStrength(entry: MemoryEntry, currentCycle: number): number {
  const cyclesSinceReview = currentCycle - entry.lastReviewedCycle
  const baseStrength = entry.reviewCount * 0.15
  const recencyBonus = entry.reviewCount > 0 ? Math.exp(-0.1 * cyclesSinceReview) * 0.3 : 0
  return Math.min(1, baseStrength + recencyBonus)
}

export function getForgettingCurveCycle(entry: MemoryEntry, currentCycle: number): number {
  const cyclesSinceReview = currentCycle - entry.lastReviewedCycle
  const effectiveDecay = 0.3 * Math.exp(-entry.strength * 1.5)
  return entry.currentConfidence * Math.exp(-effectiveDecay * cyclesSinceReview)
}

export function shouldReview(entry: MemoryEntry, currentCycle: number, config: CognitiveConfig = DEFAULT_COGNITIVE_CONFIG): boolean {
  const projected = getForgettingCurveCycle(entry, currentCycle)
  if (projected < config.minConfidenceForAction) return true
  const cyclesSinceReview = currentCycle - entry.lastReviewedCycle
  return cyclesSinceReview > Math.round(3 / Math.max(0.1, entry.strength))
}

export function updateMemory(entry: MemoryEntry, confirmed: boolean, currentCycle: number): MemoryEntry {
  const computedStrength = computeMemoryStrength(entry, currentCycle)
  const baseStrength = Math.max(entry.strength, computedStrength)
  const confidenceDelta = confirmed ? 0.05 : -0.15
  const strengthDelta = confirmed ? 0.15 : -0.1
  return {
    ...entry,
    currentConfidence: Math.max(0, Math.min(1, entry.currentConfidence + confidenceDelta)),
    strength: Math.max(0, Math.min(1, baseStrength + strengthDelta)),
    reviewCount: entry.reviewCount + 1,
    lastReviewedCycle: currentCycle,
    reviewHistory: [
      ...entry.reviewHistory,
      { cycle: currentCycle, confirmed, confidenceAtReview: entry.currentConfidence },
    ],
  }
}

// --- Multi-Detector Ensemble Voters ---

export function patternsVoter(data: ExtractedData): DetectorVote[] {
  const votes: DetectorVote[] = []

  for (const ap of data.patterns.antiPatterns) {
    votes.push({
      detector: "patterns",
      finding: `Anti-pattern: ${ap.name}`,
      severity: ap.confidence > 0.8 ? "high" : "medium",
      confidence: ap.confidence,
      evidence: ap.locations.map(l => `${l.file}:${l.line}`),
    })
  }

  if (data.patterns.conventions.length < 2) {
    votes.push({
      detector: "patterns",
      finding: "Missing coding conventions",
      severity: "medium",
      confidence: 0.6,
      evidence: [`Only ${data.patterns.conventions.length} conventions configured`],
    })
  }

  return votes
}

export function securityVoter(data: ExtractedData): DetectorVote[] {
  const votes: DetectorVote[] = []

  if (data.dependencies.vulnerable.length > 0) {
    votes.push({
      detector: "security",
      finding: `Vulnerable dependencies: ${data.dependencies.vulnerable.join(", ")}`,
      severity: "critical",
      confidence: 0.95,
      evidence: data.dependencies.vulnerable.map(v => `dependency: ${v}`),
    })
  }

  if (data.security?.apiKeyHandling === false && data.security.envVarUsage.length > 0) {
    votes.push({
      detector: "security",
      finding: "Unsafe API key handling — secrets may be exposed",
      severity: "high",
      confidence: 0.8,
      evidence: data.security.envVarUsage.map(e => `env usage: ${e}`),
    })
  }

  if (data.security?.authPatterns.length === 0 && data.apiSurface && data.apiSurface.totalExports > 10) {
    votes.push({
      detector: "security",
      finding: "No auth patterns on public API surface",
      severity: "medium",
      confidence: 0.6,
      evidence: [`${data.apiSurface.totalExports} exports with no auth patterns`],
    })
  }

  return votes
}

export function asyncVoter(data: ExtractedData): DetectorVote[] {
  const votes: DetectorVote[] = []

  for (const pattern of data.asyncPatterns ?? []) {
    const severityMap: Record<string, DetectorVote["severity"]> = {
      "fire-and-forget": "high",
      "no-await-in-loop": "medium",
      "missing-error-handler": "high",
      "race-condition": "critical",
    }
    votes.push({
      detector: "async",
      finding: `Async issue: ${pattern}`,
      severity: severityMap[pattern] ?? "medium",
      confidence: pattern === "race-condition" ? 0.9 : 0.7,
      evidence: [`detected pattern: ${pattern}`],
    })
  }

  return votes
}

export function multiDetectorEnsemble(
  data: ExtractedData,
  config: CognitiveConfig = DEFAULT_COGNITIVE_CONFIG,
): EnsembleResult {
  const votes: DetectorVote[] = [
    ...patternsVoter(data),
    ...securityVoter(data),
    ...asyncVoter(data),
  ]
  return ensembleVote(votes, config)
}

// --- Difficulty-Stratified Learning ---

export function prioritizeByDifficulty(data: ExtractedData, maxItems: number): DifficultyItem[] {
  const items = stratifyDifficulty(data)
  return items.slice(0, maxItems)
}

export function escalateComplexity(item: DifficultyItem, data: ExtractedData): { effort: "trivial" | "easy" | "medium" | "hard" | "epic"; reason: string } | null {
  if (item.difficulty < 0.5) return null

  const effort: "trivial" | "easy" | "medium" | "hard" | "epic" = item.difficulty > 0.8 ? "epic" : "hard"
  const reasons: string[] = []
  if (data.quality.complexityScore > 8) reasons.push(`complexity score ${data.quality.complexityScore}`)
  if (data.architecture.layerViolations.length > 2) reasons.push(`${data.architecture.layerViolations.length} layer violations`)
  if (data.quality.errorHandling === "generic") reasons.push("generic error handling")
  if (reasons.length === 0) reasons.push(item.reason)

  return { effort, reason: reasons.join("; ") }
}

export function difficultyAdaptiveLoop(
  data: ExtractedData,
  _audit: AuditFinding[],
  _rl: RLSignal[],
): DifficultyPlan {
  const items = stratifyDifficulty(data)
  const hardProblems = items.filter(i => i.difficulty >= 0.6)

  let priority = 0
  if (hardProblems.length >= 3) priority = 3
  else if (hardProblems.length >= 2) priority = 2
  else if (hardProblems.length >= 1) priority = 1

  let recommendedApproach: DifficultyPlan["recommendedApproach"] = "maintain"
  if (hardProblems.some(i => i.difficulty > 0.8)) recommendedApproach = "rewrite"
  else if (hardProblems.some(i => i.difficulty > 0.6)) recommendedApproach = "refactor"
  else if (items.length > 0) recommendedApproach = "improve"

  return { priority, hardProblems, recommendedApproach }
}

// --- Full Cognitive Assessment ---

export function runCognitiveAssessment(
  data: ExtractedData,
  audit: AuditFinding[],
  rl: RLSignal[],
  _meta: MetaLearning[],
  config: CognitiveConfig = DEFAULT_COGNITIVE_CONFIG,
): CognitiveAssessment {
  const maturity = assessMaturity(data)
  const adaptiveThresholds = computeAdaptiveThresholds(maturity)

  const votes: DetectorVote[] = audit.map(f => ({
    detector: "audit",
    finding: f.title,
    severity: f.severity,
    confidence: f.severity === "critical" ? 0.9 : f.severity === "high" ? 0.7 : 0.5,
    evidence: f.evidence,
  }))

  const ensemble = ensembleVote(votes, config)
  const difficultyMap = stratifyDifficulty(data)
  const reflections = reflectOnAnalysis(data, audit, rl)

  return { maturity, ensemble, adaptiveThresholds, difficultyMap, reflections }
}

// --- Helpers ---

const SEVERITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1, info: 0 }

function severityWeight(s: string): number {
  return SEVERITY_ORDER[s as keyof typeof SEVERITY_ORDER] ?? 0
}

function worstSeverity(severities: string[]): AuditFinding["severity"] {
  let worst: AuditFinding["severity"] = "info"
  for (const s of severities) {
    if (severityWeight(s) > severityWeight(worst)) worst = s as AuditFinding["severity"]
  }
  return worst
}
