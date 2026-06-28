import { describe, it, expect } from "bun:test"
import { generateMetaLearnings } from "../../src/learnings/meta"
import { audit, assessValue } from "../../src/learnings/analyze"
import type { ExtractedData } from "../../src/learnings/types"

function makeCleanData(): ExtractedData {
  return {
    metrics: {
      buildTime: 1000, testCount: 10, testPass: 10, testFail: 0, testSkip: 0,
      lintErrors: 0, typeErrors: 0, fileCount: 5, totalLOC: 500,
      avgFileLength: 100, maxFileLength: 200, dependencyCount: 3,
      devDependencyCount: 2, circularDeps: [], exportedSymbols: 15, importedSymbols: 20,
    },
    architecture: {
      moduleCount: 3, avgModuleSize: 170, maxModuleDepth: 2,
      entryPoints: ["src/index.ts"], circularDependencies: [],
      layerViolations: [], adapterPatterns: [], diContainers: [],
    },
    patterns: {
      designPatterns: [
        { name: "Singleton", type: "design", locations: [{ file: "a.ts", line: 1 }], confidence: 0.9, description: "Singleton" },
      ],
      antiPatterns: [],
      codingStyle: {
        indentStyle: "spaces", indentSize: 2, lineWidth: 100,
        quoteStyle: "single", semicolons: true, namingConvention: "camelCase",
      },
      conventions: ["eslint", "typescript-strict", "ci-cd"],
    },
    quality: {
      testCoverage: 80, testToSourceRatio: 0.35, assertionDensity: 2.5,
      errorHandling: "typed", documentationCoverage: 0.1, typeCoverage: 0.95,
      complexityScore: 1,
    },
    dependencies: {
      direct: [{ name: "zod", version: "^3.22.0", license: "MIT", size: null }],
      dev: [{ name: "vitest", version: "^1.0.0", license: "MIT", size: null }],
      outdated: [], vulnerable: [], unused: [], bundled: false,
    },
  }
}

function makeDirtyData(): ExtractedData {
  return {
    ...makeCleanData(),
    architecture: {
      ...makeCleanData().architecture,
      circularDependencies: ["a.ts <-> b.ts"],
    },
    quality: {
      ...makeCleanData().quality,
      testToSourceRatio: 0.05,
      errorHandling: "generic",
    },
    dependencies: {
      ...makeCleanData().dependencies,
      unused: ["lodash", "moment"],
    },
    patterns: {
      ...makeCleanData().patterns,
      conventions: [],
    },
  }
}

describe("generateMetaLearnings", () => {
  it("generates meta learnings for clean codebase", () => {
    const findings = audit(makeCleanData())
    const value = assessValue(makeCleanData(), findings)
    const meta = generateMetaLearnings(makeCleanData(), findings, value)
    expect(meta.length).toBeGreaterThan(0)
  })

  it("includes clean architecture learning", () => {
    const findings = audit(makeCleanData())
    const value = assessValue(makeCleanData(), findings)
    const meta = generateMetaLearnings(makeCleanData(), findings, value)
    const archLearning = meta.find(m => m.id === "meta-clean-arch")
    expect(archLearning).toBeDefined()
    expect(archLearning!.confidence).toBeGreaterThan(0.8)
  })

  it("includes good testing learning", () => {
    const findings = audit(makeCleanData())
    const value = assessValue(makeCleanData(), findings)
    const meta = generateMetaLearnings(makeCleanData(), findings, value)
    const testLearning = meta.find(m => m.id === "meta-good-testing")
    expect(testLearning).toBeDefined()
  })

  it("includes typed errors learning", () => {
    const findings = audit(makeCleanData())
    const value = assessValue(makeCleanData(), findings)
    const meta = generateMetaLearnings(makeCleanData(), findings, value)
    const errLearning = meta.find(m => m.id === "meta-typed-errors")
    expect(errLearning).toBeDefined()
  })

  it("includes tooling baseline learning", () => {
    const findings = audit(makeCleanData())
    const value = assessValue(makeCleanData(), findings)
    const meta = generateMetaLearnings(makeCleanData(), findings, value)
    const toolLearning = meta.find(m => m.id === "meta-tooling-baseline")
    expect(toolLearning).toBeDefined()
  })

  it("generates meta learnings for dirty codebase", () => {
    const findings = audit(makeDirtyData())
    const value = assessValue(makeDirtyData(), findings)
    const meta = generateMetaLearnings(makeDirtyData(), findings, value)
    expect(meta.length).toBeGreaterThan(0)
  })

  it("includes low testing learning", () => {
    const findings = audit(makeDirtyData())
    const value = assessValue(makeDirtyData(), findings)
    const meta = generateMetaLearnings(makeDirtyData(), findings, value)
    const testLearning = meta.find(m => m.id === "meta-low-testing")
    expect(testLearning).toBeDefined()
  })

  it("includes missing CI learning", () => {
    const findings = audit(makeDirtyData())
    const value = assessValue(makeDirtyData(), findings)
    const meta = generateMetaLearnings(makeDirtyData(), findings, value)
    const ciLearning = meta.find(m => m.id === "meta-missing-ci")
    expect(ciLearning).toBeDefined()
  })

  it("includes unused deps learning", () => {
    const findings = audit(makeDirtyData())
    const value = assessValue(makeDirtyData(), findings)
    const meta = generateMetaLearnings(makeDirtyData(), findings, value)
    const depsLearning = meta.find(m => m.id === "meta-unused-deps")
    expect(depsLearning).toBeDefined()
    expect(depsLearning!.evidence).toContain("lodash")
  })

  it("includes pattern usage learning when 3+ design patterns", () => {
    const data = makeCleanData()
    data.patterns.designPatterns = [
      { name: "Singleton", type: "design", locations: [{ file: "a.ts", line: 1 }], confidence: 0.9, description: "Singleton" },
      { name: "Factory", type: "design", locations: [{ file: "b.ts", line: 1 }], confidence: 0.9, description: "Factory" },
      { name: "Observer", type: "design", locations: [{ file: "c.ts", line: 1 }], confidence: 0.9, description: "Observer" },
    ]
    const findings = audit(data)
    const value = assessValue(data, findings)
    const meta = generateMetaLearnings(data, findings, value)
    const patternLearning = meta.find(m => m.id === "meta-pattern-usage")
    expect(patternLearning).toBeDefined()
    expect(patternLearning!.evidence).toContain("Singleton")
  })

  it("includes high-value learning when overallScore >= 70", () => {
    const data = makeCleanData()
    const findings = audit(data)
    // Inject a value with overallScore >= 70 directly
    const value = { ...assessValue(data, findings), overallScore: 85, strengths: ["clean architecture", "high test coverage"] }
    const meta = generateMetaLearnings(data, findings, value)
    const highValue = meta.find(m => m.id === "meta-high-value")
    expect(highValue).toBeDefined()
    expect(highValue!.evidence[0]).toContain("85")
  })

  it("omits high-value learning when overallScore < 70", () => {
    const data = makeDirtyData()
    const findings = audit(data)
    const value = { ...assessValue(data, findings), overallScore: 40, strengths: [] }
    const meta = generateMetaLearnings(data, findings, value)
    const highValue = meta.find(m => m.id === "meta-high-value")
    expect(highValue).toBeUndefined()
  })

  it("all learnings have required fields", () => {
    const findings = audit(makeCleanData())
    const value = assessValue(makeCleanData(), findings)
    const meta = generateMetaLearnings(makeCleanData(), findings, value)
    for (const m of meta) {
      expect(m.id).toBeTruthy()
      expect(m.insight).toBeTruthy()
      expect(m.confidence).toBeGreaterThan(0)
      expect(m.applicableTo.length).toBeGreaterThan(0)
      expect(m.evidence.length).toBeGreaterThan(0)
    }
  })
})
