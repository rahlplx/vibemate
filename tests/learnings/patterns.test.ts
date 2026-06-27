import { describe, it, expect } from "bun:test"
import { findPatterns, summarizePatterns } from "../../src/learnings/patterns"
import type { ExtractedData } from "../../src/learnings/types"

function makeData(): ExtractedData {
  return {
    metrics: {
      buildTime: null, testCount: 0, testPass: 0, testFail: 0, testSkip: 0,
      lintErrors: 0, typeErrors: 0, fileCount: 3, totalLOC: 300,
      avgFileLength: 100, maxFileLength: 150, dependencyCount: 2,
      devDependencyCount: 1, circularDeps: [], exportedSymbols: 5, importedSymbols: 8,
    },
    architecture: {
      moduleCount: 2, avgModuleSize: 150, maxModuleDepth: 1,
      entryPoints: ["index.ts"], circularDependencies: [],
      layerViolations: [], adapterPatterns: [], diContainers: [],
    },
    patterns: {
      designPatterns: [
        { name: "Singleton", type: "design", locations: [{ file: "a.ts", line: 1 }], confidence: 0.9, description: "Singleton" },
        { name: "Factory", type: "design", locations: [{ file: "b.ts", line: 1 }], confidence: 0.8, description: "Factory" },
      ],
      antiPatterns: [
        { name: "God File", type: "anti", locations: [{ file: "big.ts", line: 1 }], confidence: 0.9, description: "600 lines" },
      ],
      codingStyle: {
        indentStyle: "spaces", indentSize: 2, lineWidth: 100,
        quoteStyle: "single", semicolons: true, namingConvention: "camelCase",
      },
      conventions: ["eslint", "typescript-strict"],
    },
    quality: {
      testCoverage: null, testToSourceRatio: 0.3, assertionDensity: 2,
      errorHandling: "typed", documentationCoverage: 0.05, typeCoverage: 0.9,
      complexityScore: 2,
    },
    dependencies: {
      direct: [{ name: "zod", version: "^3.22.0", license: "MIT", size: null }],
      dev: [{ name: "vitest", version: "^1.0.0", license: "MIT", size: null }],
      outdated: [], vulnerable: [], unused: [], bundled: false,
    },
  }
}

describe("findPatterns", () => {
  it("returns pattern insights for design patterns", () => {
    const insights = findPatterns(makeData())
    const singleton = insights.find(i => i.pattern.name === "Singleton")
    expect(singleton).toBeDefined()
    expect(singleton!.confidence).toBeGreaterThan(0.5)
  })

  it("returns insights for anti-patterns", () => {
    const insights = findPatterns(makeData())
    const godFile = insights.find(i => i.pattern.name === "God File")
    expect(godFile).toBeDefined()
    expect(godFile!.pattern.type).toBe("anti")
  })

  it("returns style insights", () => {
    const insights = findPatterns(makeData())
    const styleInsights = insights.filter(i => i.applicableTo.includes("code-style"))
    expect(styleInsights.length).toBeGreaterThan(0)
  })

  it("returns convention insights", () => {
    const insights = findPatterns(makeData())
    const toolInsights = insights.filter(i => i.applicableTo.includes("tooling"))
    expect(toolInsights.length).toBeGreaterThan(0)
  })

  it("returns error handling insight", () => {
    const insights = findPatterns(makeData())
    const errInsight = insights.find(i => i.applicableTo.includes("error-handling"))
    expect(errInsight).toBeDefined()
  })
})

describe("summarizePatterns", () => {
  it("groups design and anti patterns", () => {
    const insights = findPatterns(makeData())
    const summary = summarizePatterns(insights)
    expect(summary.topDesignPatterns.length).toBeGreaterThan(0)
    expect(summary.topAntiPatterns.length).toBeGreaterThan(0)
  })

  it("includes style summary", () => {
    const insights = findPatterns(makeData())
    const summary = summarizePatterns(insights)
    expect(summary.styleSummary.length).toBeGreaterThan(0)
  })

  it("includes convention summary", () => {
    const insights = findPatterns(makeData())
    const summary = summarizePatterns(insights)
    expect(summary.conventionSummary.length).toBeGreaterThan(0)
  })
})
