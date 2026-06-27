import { describe, it, expect } from "bun:test"
import {
  // Ebbinghaus memory
  computeMemoryStrength,
  getForgettingCurveCycle,
  shouldReview,
  updateMemory,
  createMemoryEntry,
  // Ensemble voters
  patternsVoter,
  securityVoter,
  asyncVoter,
  multiDetectorEnsemble,
  // Difficulty stratification
  prioritizeByDifficulty,
  escalateComplexity,
  difficultyAdaptiveLoop,
  // Types
  type MemoryEntry,
  type CognitiveConfig,
} from "../../src/learnings/cognitive"
import type { ExtractedData } from "../../src/learnings/types"

function makeConfig(overrides: Partial<CognitiveConfig> = {}): CognitiveConfig {
  return {
    ensembleThreshold: 0.4,
    confidenceDecayRate: 0.3,
    maturityMinFiles: 50,
    minConfidenceForAction: 0.3,
    ...overrides,
  }
}

function makeData(overrides: Partial<ExtractedData> = {}): ExtractedData {
  return {
    metrics: {
      buildTime: null, testCount: 0, testPass: 0, testFail: 0, testSkip: 0,
      lintErrors: 0, typeErrors: 0, fileCount: 10, totalLOC: 500,
      avgFileLength: 50, maxFileLength: 200, dependencyCount: 5,
      devDependencyCount: 3, circularDeps: [], exportedSymbols: 10,
      importedSymbols: 8,
    },
    architecture: {
      moduleCount: 5, avgModuleSize: 100, maxModuleDepth: 3,
      entryPoints: [], circularDependencies: [], layerViolations: [],
      adapterPatterns: [], diContainers: [],
    },
    patterns: {
      designPatterns: [], antiPatterns: [], codingStyle: {
        indentStyle: "spaces", indentSize: 2, lineWidth: 80,
        quoteStyle: "single", semicolons: true, namingConvention: "camelCase",
      },
      conventions: [],
    },
    quality: {
      testCoverage: null, testToSourceRatio: 0.3, assertionDensity: 0.5,
      errorHandling: "typed", documentationCoverage: 0.4, typeCoverage: 0.8,
      complexityScore: 3,
    },
    dependencies: { direct: [], dev: [], outdated: [], vulnerable: [], unused: [], bundled: false },
    ...overrides,
  }
}

function makeMemory(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  const base = createMemoryEntry("test-finding", 0.8, 0)
  return { ...base, ...overrides }
}

// ============================================================
// 1. Ebbinghaus Memory Decay
// ============================================================

describe("Ebbinghaus Memory Decay", () => {
  it("createMemoryEntry initializes with correct defaults", () => {
    const entry = createMemoryEntry("test-finding", 0.9, 0)
    expect(entry.finding).toBe("test-finding")
    expect(entry.initialConfidence).toBe(0.9)
    expect(entry.currentConfidence).toBe(0.9)
    expect(entry.strength).toBe(0)
    expect(entry.reviewCount).toBe(0)
    expect(entry.lastReviewedCycle).toBe(0)
    expect(entry.reviewHistory).toEqual([])
  })

  it("computeMemoryStrength increases with review count", () => {
    const base = makeMemory()
    const s0 = computeMemoryStrength(base, 0)
    const s1 = computeMemoryStrength({ ...base, reviewCount: 1, strength: 0.2 }, 1)
    const s3 = computeMemoryStrength({ ...base, reviewCount: 3, strength: 0.5 }, 3)
    expect(s1).toBeGreaterThan(s0)
    expect(s3).toBeGreaterThan(s1)
  })

  it("computeMemoryStrength caps at 1.0", () => {
    const entry = makeMemory({ reviewCount: 100, strength: 0.99 })
    const s = computeMemoryStrength(entry, 100)
    expect(s).toBeLessThanOrEqual(1.0)
  })

  it("getForgettingCurveCycle returns lower confidence over time without review", () => {
    const entry = makeMemory({ currentConfidence: 0.9 })
    const c0 = getForgettingCurveCycle(entry, 0)
    const c1 = getForgettingCurveCycle(entry, 1)
    const c5 = getForgettingCurveCycle(entry, 5)
    expect(c0).toBeGreaterThanOrEqual(c1)
    expect(c1).toBeGreaterThanOrEqual(c5)
    expect(c5).toBeGreaterThan(0)
  })

  it("getForgettingCurveCycle decays slower with higher strength", () => {
    const weak = makeMemory({ currentConfidence: 0.8, strength: 0.1 })
    const strong = makeMemory({ currentConfidence: 0.8, strength: 0.9 })
    const cWeak = getForgettingCurveCycle(weak, 3)
    const cStrong = getForgettingCurveCycle(strong, 3)
    expect(cStrong).toBeGreaterThan(cWeak)
  })

  it("shouldReview returns true when confidence drops below threshold", () => {
    const entry = makeMemory({ currentConfidence: 0.15, lastReviewedCycle: 0 })
    const config = makeConfig({ minConfidenceForAction: 0.3 })
    expect(shouldReview(entry, 5, config)).toBe(true)
  })

  it("shouldReview returns false when confidence is above threshold", () => {
    const entry = makeMemory({ currentConfidence: 0.8, lastReviewedCycle: 0 })
    const config = makeConfig({ minConfidenceForAction: 0.3 })
    expect(shouldReview(entry, 1, config)).toBe(false)
  })

  it("shouldReview returns true when enough cycles have passed even with decent confidence", () => {
    const entry = makeMemory({ currentConfidence: 0.7, lastReviewedCycle: 0, strength: 0.2 })
    const config = makeConfig({ minConfidenceForAction: 0.3 })
    expect(shouldReview(entry, 10, config)).toBe(true)
  })

  it("updateMemory increases strength when confirmed", () => {
    const entry = makeMemory({ currentConfidence: 0.8, strength: 0.2, reviewCount: 0 })
    const updated = updateMemory(entry, true, 5)
    expect(updated.reviewCount).toBe(1)
    expect(updated.strength).toBeGreaterThan(0.2)
    expect(updated.lastReviewedCycle).toBe(5)
    expect(updated.reviewHistory).toHaveLength(1)
    expect(updated.reviewHistory[0].confirmed).toBe(true)
  })

  it("updateMemory decreases confidence when rejected", () => {
    const entry = makeMemory({ currentConfidence: 0.8, strength: 0.5 })
    const updated = updateMemory(entry, false, 5)
    expect(updated.currentConfidence).toBeLessThan(0.8)
    expect(updated.strength).toBeLessThan(0.5)
    expect(updated.reviewHistory[0].confirmed).toBe(false)
  })

  it("updateMemory preserves review history", () => {
    let entry = makeMemory({ currentConfidence: 0.8 })
    entry = updateMemory(entry, true, 1)
    entry = updateMemory(entry, true, 3)
    entry = updateMemory(entry, false, 5)
    expect(entry.reviewHistory).toHaveLength(3)
    expect(entry.reviewCount).toBe(3)
  })
})

// ============================================================
// 2. Ensemble Voters (patterns, security, async)
// ============================================================

describe("Ensemble Voters", () => {
  it("patternsVoter produces votes for anti-patterns", () => {
    const data = makeData({
      patterns: {
        designPatterns: [],
        antiPatterns: [{
          name: "God Object",
          type: "anti",
          locations: [{ file: "src/index.ts", line: 1 }],
          confidence: 0.9,
          description: "Module does too many things",
        }],
        codingStyle: {
          indentStyle: "spaces", indentSize: 2, lineWidth: 80,
          quoteStyle: "single", semicolons: true, namingConvention: "camelCase",
        },
        conventions: ["eslint", "prettier"],
      },
    })
    const votes = patternsVoter(data)
    expect(votes.length).toBeGreaterThan(0)
    expect(votes.some(v => v.finding.includes("God Object"))).toBe(true)
    expect(votes[0].detector).toBe("patterns")
  })

  it("patternsVoter produces votes for missing conventions", () => {
    const data = makeData({
      patterns: {
        designPatterns: [],
        antiPatterns: [],
        codingStyle: {
          indentStyle: "spaces", indentSize: 2, lineWidth: 80,
          quoteStyle: "single", semicolons: true, namingConvention: "camelCase",
        },
        conventions: [],
      },
    })
    const votes = patternsVoter(data)
    expect(votes.some(v => v.finding.includes("convention"))).toBe(true)
  })

  it("patternsVoter returns empty for clean patterns", () => {
    const data = makeData({
      patterns: {
        designPatterns: [{ name: "Adapter", type: "design", locations: [], confidence: 0.8, description: "Clean adapter" }],
        antiPatterns: [],
        codingStyle: {
          indentStyle: "spaces", indentSize: 2, lineWidth: 80,
          quoteStyle: "single", semicolons: true, namingConvention: "camelCase",
        },
        conventions: ["eslint", "prettier", "strict-ts"],
      },
    })
    const votes = patternsVoter(data)
    expect(votes).toHaveLength(0)
  })

  it("securityVoter produces votes for vulnerable dependencies", () => {
    const data = makeData({
      dependencies: {
        direct: [], dev: [], outdated: [], vulnerable: ["lodash@4.17.20"], unused: [], bundled: false,
      },
    })
    const votes = securityVoter(data)
    expect(votes.some(v => v.finding.toLowerCase().includes("vulnerable"))).toBe(true)
    expect(votes[0].detector).toBe("security")
  })

  it("securityVoter produces votes for unsafe env patterns", () => {
    const data = makeData({
      security: {
        apiKeyHandling: false,
        envVarUsage: ["process.env.API_KEY", "process.env.SECRET"],
        authPatterns: [],
      },
    })
    const votes = securityVoter(data)
    expect(votes.some(v => v.finding.includes("API key") || v.finding.includes("env"))).toBe(true)
  })

  it("securityVoter returns empty for clean security posture", () => {
    const data = makeData({
      dependencies: { direct: [], dev: [], outdated: [], vulnerable: [], unused: [], bundled: false },
      security: { apiKeyHandling: true, envVarUsage: [], authPatterns: ["jwt", "oauth2"] },
    })
    const votes = securityVoter(data)
    expect(votes).toHaveLength(0)
  })

  it("asyncVoter produces votes for unhandled promises", () => {
    const data = makeData({
      asyncPatterns: ["fire-and-forget", "no-await-in-loop"],
    })
    const votes = asyncVoter(data)
    expect(votes.some(v => v.finding.includes("fire-and-forget") || v.finding.includes("async"))).toBe(true)
    expect(votes[0].detector).toBe("async")
  })

  it("asyncVoter returns empty for clean async patterns", () => {
    const data = makeData({ asyncPatterns: [] })
    const votes = asyncVoter(data)
    expect(votes).toHaveLength(0)
  })

  it("multiDetectorEnsemble combines votes from all detectors", () => {
    const data = makeData({
      patterns: {
        designPatterns: [],
        antiPatterns: [{
          name: "Spaghetti Code",
          type: "anti",
          locations: [{ file: "src/app.ts", line: 10 }],
          confidence: 0.85,
          description: "Tangled control flow",
        }],
        codingStyle: {
          indentStyle: "spaces", indentSize: 2, lineWidth: 80,
          quoteStyle: "single", semicolons: true, namingConvention: "camelCase",
        },
        conventions: [],
      },
      asyncPatterns: ["fire-and-forget"],
    })
    const result = multiDetectorEnsemble(data, makeConfig())
    const totalFindings = result.confirmed.length + result.rejected.length
    expect(totalFindings).toBeGreaterThan(0)
    expect(result.confirmed.some(f => f.votes.some(v => v.detector === "patterns"))).toBe(true)
    expect(result.confirmed.some(f => f.votes.some(v => v.detector === "async"))).toBe(true)
  })

  it("multiDetectorEnsemble applies ensemble threshold to combined votes", () => {
    const data = makeData({
      asyncPatterns: ["fire-and-forget"],
    })
    const result = multiDetectorEnsemble(data, makeConfig({ ensembleThreshold: 0.9 }))
    // Only 1 detector votes → confidence below 0.9 threshold → rejected
    expect(result.confirmed.length).toBe(0)
  })
})

// ============================================================
// 3. Difficulty-Stratified Learning
// ============================================================

describe("Difficulty-Stratified Learning", () => {
  it("prioritizeByDifficulty returns top N hardest items", () => {
    const data = makeData({
      quality: { ...makeData().quality, complexityScore: 12 },
      architecture: { ...makeData().architecture, layerViolations: ["a→b", "b→c"] },
    })
    const items = prioritizeByDifficulty(data, 2)
    expect(items.length).toBeLessThanOrEqual(2)
    expect(items[0].difficulty).toBeGreaterThanOrEqual(items[1]?.difficulty ?? 0)
  })

  it("prioritizeByDifficulty returns all items when maxItems exceeds count", () => {
    const data = makeData({
      quality: { ...makeData().quality, complexityScore: 12, errorHandling: "generic" },
    })
    const items = prioritizeByDifficulty(data, 10)
    expect(items.length).toBeGreaterThan(0)
  })

  it("escalateComplexity returns escalated item when difficulty exceeds threshold", () => {
    const data = makeData({
      quality: { ...makeData().quality, complexityScore: 12 },
    })
    const items = prioritizeByDifficulty(data, 1)
    const escalated = escalateComplexity(items[0], data)
    expect(escalated).toBeDefined()
    expect(escalated!.effort).toMatch(/hard|epic/)
  })

  it("escalateComplexity returns null when difficulty is manageable", () => {
    const data = makeData({
      quality: { ...makeData().quality, complexityScore: 2 },
    })
    const items = prioritizeByDifficulty(data, 1)
    if (items.length > 0 && items[0].difficulty < 0.5) {
      const escalated = escalateComplexity(items[0], data)
      expect(escalated).toBeNull()
    }
  })

  it("difficultyAdaptiveLoop returns prioritized analysis plan", () => {
    const data = makeData({
      quality: { ...makeData().quality, complexityScore: 10, errorHandling: "generic" },
      architecture: { ...makeData().architecture, layerViolations: ["a→b"] },
    })
    const plan = difficultyAdaptiveLoop(data, [], [])
    expect(plan.priority).toBeGreaterThan(0)
    expect(plan.hardProblems.length).toBeGreaterThan(0)
    expect(plan.recommendedApproach).toBeDefined()
  })

  it("difficultyAdaptiveLoop handles clean codebase", () => {
    const data = makeData()
    const plan = difficultyAdaptiveLoop(data, [], [])
    expect(plan.priority).toBe(0)
    expect(plan.hardProblems).toHaveLength(0)
    expect(plan.recommendedApproach).toBe("maintain")
  })
})
