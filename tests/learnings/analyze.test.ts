import { describe, it, expect } from "bun:test"
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
        { name: "Factory", type: "design", locations: [{ file: "b.ts", line: 1 }], confidence: 0.8, description: "Factory" },
      ],
      antiPatterns: [],
      codingStyle: {
        indentStyle: "spaces", indentSize: 2, lineWidth: 100,
        quoteStyle: "single", semicolons: true, namingConvention: "camelCase",
      },
      conventions: ["eslint", "prettier", "typescript-strict", "ci-cd", "editorconfig"],
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
      circularDependencies: ["a.ts <-> b.ts"],
      entryPoints: ["a", "b", "c", "d", "e"],
    },
    patterns: {
      ...makeCleanData().patterns,
      antiPatterns: [
        { name: "God File", type: "anti", locations: [{ file: "big.ts", line: 1 }], confidence: 0.9, description: "800 lines" },
        { name: "Deep Nesting", type: "anti", locations: [{ file: "deep.ts", line: 1 }], confidence: 0.8, description: "8 levels" },
        { name: "God File", type: "anti", locations: [{ file: "huge.ts", line: 1 }], confidence: 0.9, description: "1000 lines" },
        { name: "Deep Nesting", type: "anti", locations: [{ file: "deep2.ts", line: 1 }], confidence: 0.8, description: "7 levels" },
        { name: "God File", type: "anti", locations: [{ file: "massive.ts", line: 1 }], confidence: 0.9, description: "1200 lines" },
        { name: "Deep Nesting", type: "anti", locations: [{ file: "deep3.ts", line: 1 }], confidence: 0.8, description: "9 levels" },
      ],
      conventions: [],
    },
    quality: {
      ...makeCleanData().quality,
      testToSourceRatio: 0.05,
      errorHandling: "generic",
      complexityScore: 8,
    },
    dependencies: {
      ...makeCleanData().dependencies,
      unused: ["lodash", "moment", "underscore"],
      vulnerable: ["old-package"],
    },
  }
}

describe("audit", () => {
  it("returns empty for clean data", () => {
    const findings = audit(makeCleanData())
    expect(findings.length).toBe(0)
  })

  it("detects layer violations", () => {
    const findings = audit(makeDirtyData())
    const layer = findings.find(f => f.id === "arch-layer-violations")
    expect(layer).toBeDefined()
    expect(layer!.severity).toBe("high")
  })

  it("detects circular dependencies", () => {
    const findings = audit(makeDirtyData())
    const circ = findings.find(f => f.id === "arch-circular-deps")
    expect(circ).toBeDefined()
    expect(circ!.severity).toBe("high")
  })

  it("detects low test ratio", () => {
    const findings = audit(makeDirtyData())
    const test = findings.find(f => f.id === "quality-low-tests")
    expect(test).toBeDefined()
    expect(test!.severity).toBe("high")
  })

  it("detects generic error handling", () => {
    const findings = audit(makeDirtyData())
    const err = findings.find(f => f.id === "quality-generic-errors")
    expect(err).toBeDefined()
  })

  it("detects unused dependencies", () => {
    const findings = audit(makeDirtyData())
    const unused = findings.find(f => f.id === "deps-unused")
    expect(unused).toBeDefined()
    expect(unused!.evidence.length).toBe(3)
  })

  it("detects vulnerable dependencies", () => {
    const findings = audit(makeDirtyData())
    const vuln = findings.find(f => f.id === "deps-vulnerable")
    expect(vuln).toBeDefined()
    expect(vuln!.severity).toBe("critical")
  })

  it("detects missing linter", () => {
    const findings = audit(makeDirtyData())
    const lint = findings.find(f => f.id === "style-no-linter")
    expect(lint).toBeDefined()
  })

  it("detects many entry points", () => {
    const findings = audit(makeDirtyData())
    const ep = findings.find(f => f.id === "arch-many-entrypoints")
    expect(ep).toBeDefined()
  })

  it("detects anti-patterns", () => {
    const findings = audit(makeDirtyData())
    const ap = findings.find(f => f.id === "quality-high-complexity")
    expect(ap).toBeDefined()
    expect(ap!.evidence.length).toBeGreaterThan(0)
  })
})

describe("assessValue", () => {
  it("returns high score for clean data", () => {
    const value = assessValue(makeCleanData(), audit(makeCleanData()))
    expect(value.overallScore).toBeGreaterThanOrEqual(40)
    expect(value.strengths.length).toBeGreaterThan(0)
  })

  it("returns low score for dirty data", () => {
    const value = assessValue(makeDirtyData(), audit(makeDirtyData()))
    expect(value.overallScore).toBeLessThan(70)
    expect(value.weaknesses.length).toBeGreaterThan(0)
  })

  it("calculates ROI estimate", () => {
    const value = assessValue(makeDirtyData(), audit(makeDirtyData()))
    expect(value.roiEstimate.developmentHours).toBeGreaterThan(0)
    expect(value.roiEstimate.maintenanceMultiplier).toBeGreaterThan(1)
  })

  it("includes dimensions", () => {
    const value = assessValue(makeCleanData(), [])
    expect(value.dimensions).toHaveProperty("architecture")
    expect(value.dimensions).toHaveProperty("testing")
    expect(value.dimensions).toHaveProperty("errorHandling")
    expect(value.dimensions).toHaveProperty("tooling")
  })
})
