import { describe, it, expect } from "bun:test"
import { generateRLSignals } from "../../src/learnings/rl"
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
      conventions: ["eslint", "typescript-strict", "ci-cd", "prettier", "editorconfig"],
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
      layerViolations: ["domain imports from infrastructure"],
    },
    quality: {
      ...makeCleanData().quality,
      testToSourceRatio: 0.05,
      errorHandling: "generic",
    },
    patterns: {
      ...makeCleanData().patterns,
      antiPatterns: [
        { name: "God File", type: "anti", locations: [{ file: "big.ts", line: 1 }], confidence: 0.9, description: "600 lines" },
      ],
      conventions: [],
    },
    dependencies: {
      ...makeCleanData().dependencies,
      unused: ["lodash"],
    },
  }
}

describe("generateRLSignals", () => {
  it("generates positive signals for clean codebase", () => {
    const findings = audit(makeCleanData())
    const value = assessValue(makeCleanData(), findings)
    const signals = generateRLSignals(makeCleanData(), findings, value)
    expect(signals.length).toBeGreaterThan(0)
    const aggregate = signals.find(s => s.id === "rl-aggregate")
    expect(aggregate).toBeDefined()
    expect(aggregate!.reward).toBeGreaterThan(0)
  })

  it("includes clean architecture signal", () => {
    const findings = audit(makeCleanData())
    const value = assessValue(makeCleanData(), findings)
    const signals = generateRLSignals(makeCleanData(), findings, value)
    const archSignal = signals.find(s => s.id === "rl-clean-arch")
    expect(archSignal).toBeDefined()
    expect(archSignal!.reward).toBeGreaterThan(0)
  })

  it("includes good testing signal", () => {
    const findings = audit(makeCleanData())
    const value = assessValue(makeCleanData(), findings)
    const signals = generateRLSignals(makeCleanData(), findings, value)
    const testSignal = signals.find(s => s.id === "rl-good-tests")
    expect(testSignal).toBeDefined()
    expect(testSignal!.reward).toBeGreaterThan(0)
  })

  it("includes typed errors signal", () => {
    const findings = audit(makeCleanData())
    const value = assessValue(makeCleanData(), findings)
    const signals = generateRLSignals(makeCleanData(), findings, value)
    const errSignal = signals.find(s => s.id === "rl-typed-errors")
    expect(errSignal).toBeDefined()
    expect(errSignal!.reward).toBeGreaterThan(0)
  })

  it("generates negative signals for dirty codebase", () => {
    const findings = audit(makeDirtyData())
    const value = assessValue(makeDirtyData(), findings)
    const signals = generateRLSignals(makeDirtyData(), findings, value)
    const aggregate = signals.find(s => s.id === "rl-aggregate")
    expect(aggregate).toBeDefined()
    expect(aggregate!.reward).toBeLessThan(0)
  })

  it("includes layer violations signal (negative)", () => {
    const findings = audit(makeDirtyData())
    const value = assessValue(makeDirtyData(), findings)
    const signals = generateRLSignals(makeDirtyData(), findings, value)
    const layerSignal = signals.find(s => s.id === "rl-layer-violations")
    expect(layerSignal).toBeDefined()
    expect(layerSignal!.reward).toBeLessThan(0)
  })

  it("includes no tests signal (negative)", () => {
    const findings = audit(makeDirtyData())
    const value = assessValue(makeDirtyData(), findings)
    const signals = generateRLSignals(makeDirtyData(), findings, value)
    const noTestSignal = signals.find(s => s.id === "rl-no-tests")
    expect(noTestSignal).toBeDefined()
    expect(noTestSignal!.reward).toBeLessThan(0)
  })

  it("includes unused deps signal (negative)", () => {
    const findings = audit(makeDirtyData())
    const value = assessValue(makeDirtyData(), findings)
    const signals = generateRLSignals(makeDirtyData(), findings, value)
    const unusedSignal = signals.find(s => s.id === "rl-unused-deps")
    expect(unusedSignal).toBeDefined()
    expect(unusedSignal!.reward).toBeLessThan(0)
  })

  it("all signals have required fields", () => {
    const findings = audit(makeCleanData())
    const value = assessValue(makeCleanData(), findings)
    const signals = generateRLSignals(makeCleanData(), findings, value)
    for (const s of signals) {
      expect(s.id).toBeTruthy()
      expect(s.action).toBeTruthy()
      expect(typeof s.reward).toBe("number")
      expect(s.context).toBeTruthy()
      expect(s.outcome).toBeTruthy()
      expect(s.learnings.length).toBeGreaterThan(0)
    }
  })

  it("reward values are bounded between -1 and 1", () => {
    const findings = audit(makeDirtyData())
    const value = assessValue(makeDirtyData(), findings)
    const signals = generateRLSignals(makeDirtyData(), findings, value)
    for (const s of signals) {
      expect(s.reward).toBeGreaterThanOrEqual(-5)
      expect(s.reward).toBeLessThanOrEqual(5)
    }
  })
})
