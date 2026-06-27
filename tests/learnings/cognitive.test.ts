import { describe, it, expect } from "bun:test"
import {
  assessMaturity,
  computeAdaptiveThresholds,
  ensembleVote,
  stratifyDifficulty,
  reflectOnAnalysis,
  applyConfidenceDecay,
  runCognitiveAssessment,
  DEFAULT_COGNITIVE_CONFIG,
} from "../../src/learnings/cognitive"
import type { ExtractedData, AuditFinding, RLSignal, DetectorVote } from "../../src/learnings/types"

function makeData(overrides: Partial<ExtractedData> = {}): ExtractedData {
  return {
    metrics: {
      buildTime: null, testCount: 10, testPass: 10, testFail: 0, testSkip: 0,
      lintErrors: 0, typeErrors: 0, fileCount: 80, totalLOC: 5000,
      avgFileLength: 100, maxFileLength: 300, dependencyCount: 5,
      devDependencyCount: 3, circularDeps: [], exportedSymbols: 30, importedSymbols: 20,
    },
    architecture: {
      moduleCount: 3, avgModuleSize: 200, maxModuleDepth: 3,
      entryPoints: ["src/index.ts"], circularDependencies: [],
      layerViolations: [], adapterPatterns: [], diContainers: [],
    },
    patterns: {
      designPatterns: [], antiPatterns: [],
      codingStyle: { indentStyle: "spaces", indentSize: 2, lineWidth: 100, quoteStyle: "single", semicolons: true, namingConvention: "camelCase" },
      conventions: ["typescript-strict", "eslint", "prettier", "ci-cd", "editorconfig"],
    },
    quality: {
      testCoverage: 0.8, testToSourceRatio: 0.3, assertionDensity: 5,
      errorHandling: "typed", documentationCoverage: 0.6, typeCoverage: 0.9,
      complexityScore: 2,
    },
    dependencies: {
      direct: [{ name: "zod", version: "^3.0.0", license: "MIT", size: null }],
      dev: [{ name: "vitest", version: "^1.0.0", license: "MIT", size: null }],
      outdated: [], vulnerable: [], unused: [], bundled: false,
    },
    monorepo: { isMonorepo: true, tool: "turborepo", packageCount: 5 },
    apiSurface: { totalExports: 60, jsdocCoverage: 0.5, exportedTypes: 10, exportedFunctions: 20 },
    asyncPatterns: ["async-iterator"],
    security: { apiKeyHandling: true, envVarUsage: ["NODE_ENV"], authPatterns: ["jwt"] },
    testOrg: { totalTestFiles: 25, testCategories: ["unit", "integration"], hasUnitTests: true, hasIntegrationTests: true, testFramework: "vitest" },
    ...overrides,
  }
}

function makeAudit(overrides: Partial<AuditFinding> = {}): AuditFinding {
  return {
    id: "test-1",
    severity: "medium",
    category: "quality",
    title: "Test finding",
    description: "A test finding",
    evidence: ["evidence 1"],
    recommendation: "Fix it",
    effort: "medium",
    impact: "medium",
    ...overrides,
  }
}

function makeRL(overrides: Partial<RLSignal> = {}): RLSignal {
  return {
    id: "rl-1",
    action: "test-action",
    reward: 0.5,
    context: "test",
    outcome: "success",
    learnings: [],
    ...overrides,
  }
}

describe("assessMaturity", () => {
  it("returns greenfield for small project", () => {
    const data = makeData({
      metrics: { ...makeData().metrics, fileCount: 10 },
      monorepo: { isMonorepo: false, tool: null, packageCount: 0 },
      testOrg: { totalTestFiles: 2, testCategories: [], hasUnitTests: false, hasIntegrationTests: false, testFramework: null },
      patterns: { ...makeData().patterns, conventions: ["eslint"] },
      apiSurface: { totalExports: 5, jsdocCoverage: 0, exportedTypes: 0, exportedFunctions: 0 },
    })
    const m = assessMaturity(data)
    expect(m.tier).toBe("greenfield")
    expect(m.score).toBeLessThan(0.35)
  })

  it("returns enterprise for large monorepo", () => {
    const data = makeData()
    const m = assessMaturity(data)
    expect(["mature", "enterprise"]).toContain(m.tier)
    expect(m.score).toBeGreaterThanOrEqual(0.6)
  })

  it("includes factors for each dimension", () => {
    const m = assessMaturity(makeData())
    expect(m.factors.length).toBeGreaterThanOrEqual(3)
  })
})

describe("computeAdaptiveThresholds", () => {
  it("scales thresholds with maturity", () => {
    const greenfield = computeAdaptiveThresholds({ score: 0, factors: [], tier: "greenfield" })
    const enterprise = computeAdaptiveThresholds({ score: 1, factors: [], tier: "enterprise" })
    expect(enterprise.godFileLines).toBeGreaterThan(greenfield.godFileLines)
    expect(enterprise.maxNesting).toBeGreaterThan(greenfield.maxNesting)
  })
})

describe("ensembleVote", () => {
  it("confirms finding with sufficient confidence", () => {
    const votes: DetectorVote[] = [
      { detector: "audit", finding: "God File", severity: "high", confidence: 0.8, evidence: ["500 lines"] },
    ]
    const result = ensembleVote(votes)
    expect(result.confirmed.length).toBe(1)
    expect(result.confirmed[0].finding).toBe("God File")
  })

  it("rejects finding below threshold", () => {
    const votes: DetectorVote[] = [
      { detector: "audit", finding: "Maybe issue", severity: "low", confidence: 0.2, evidence: [] },
    ]
    const result = ensembleVote(votes)
    expect(result.confirmed.length).toBe(0)
    expect(result.rejected.length).toBe(1)
  })

  it("merges duplicate findings with highest severity", () => {
    const votes: DetectorVote[] = [
      { detector: "audit", finding: "God File", severity: "medium", confidence: 0.7, evidence: ["e1"] },
      { detector: "patterns", finding: "God File", severity: "high", confidence: 0.8, evidence: ["e2"] },
    ]
    const result = ensembleVote(votes)
    expect(result.confirmed.length).toBe(1)
    expect(result.confirmed[0].severity).toBe("high")
    expect(result.confirmed[0].evidence).toContain("e1")
    expect(result.confirmed[0].evidence).toContain("e2")
  })
})

describe("stratifyDifficulty", () => {
  it("identifies hard problems first", () => {
    const data = makeData({
      quality: { ...makeData().quality, complexityScore: 10, errorHandling: "generic", testToSourceRatio: 0.05 },
      architecture: { ...makeData().architecture, layerViolations: ["violation1"] },
    })
    const items = stratifyDifficulty(data)
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].difficulty).toBeGreaterThanOrEqual(items[items.length - 1].difficulty)
  })

  it("returns empty for clean codebase", () => {
    const data = makeData({
      quality: { ...makeData().quality, complexityScore: 1, testToSourceRatio: 0.5, documentationCoverage: 0.8, errorHandling: "typed" as const },
      dependencies: { ...makeData().dependencies, unused: [] },
      architecture: { ...makeData().architecture, layerViolations: [] },
    })
    const items = stratifyDifficulty(data)
    expect(items.length).toBe(0)
  })
})

describe("reflectOnAnalysis", () => {
  it("warns when no findings detected", () => {
    const r = reflectOnAnalysis(makeData(), [], [])
    expect(r.some(x => x.aspect === "detection-coverage")).toBe(true)
  })

  it("flags critical count dilution", () => {
    const audit = Array.from({ length: 5 }, (_, i) => makeAudit({ id: `c-${i}`, severity: "critical" }))
    const r = reflectOnAnalysis(makeData(), audit, [])
    expect(r.some(x => x.aspect === "severity-calibration")).toBe(true)
  })

  it("increases confidence for repeated reflections", () => {
    const prev = [{ aspect: "testing-maturity", observation: "", insight: "", action: "", confidence: 0.5 }]
    const data = makeData({ quality: { ...makeData().quality, testToSourceRatio: 0.05 } })
    const r = reflectOnAnalysis(data, [], [], prev)
    const testingReflection = r.find(x => x.aspect === "testing-maturity")
    expect(testingReflection?.confidence).toBeGreaterThan(0.5)
  })
})

describe("applyConfidenceDecay", () => {
  it("decays confidence over cycles", () => {
    const initial = 0.9
    const after1 = applyConfidenceDecay(initial, 1)
    const after3 = applyConfidenceDecay(initial, 3)
    expect(after1).toBeLessThan(initial)
    expect(after3).toBeLessThan(after1)
  })

  it("returns same confidence at cycle 0", () => {
    expect(applyConfidenceDecay(0.7, 0)).toBe(0.7)
  })
})

describe("runCognitiveAssessment", () => {
  it("returns full assessment structure", () => {
    const data = makeData()
    const audit = [makeAudit(), makeAudit({ id: "2", severity: "high" })]
    const rl = [makeRL()]
    const assessment = runCognitiveAssessment(data, audit, rl, [])
    expect(assessment.maturity).toBeDefined()
    expect(assessment.ensemble).toBeDefined()
    expect(assessment.adaptiveThresholds).toBeDefined()
    expect(assessment.difficultyMap).toBeDefined()
    expect(assessment.reflections).toBeDefined()
  })
})
