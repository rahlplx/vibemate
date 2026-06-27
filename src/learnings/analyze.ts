import type { ExtractedData, AuditFinding, ValueAssessment } from "./types"

export function audit(data: ExtractedData): AuditFinding[] {
  const findings: AuditFinding[] = []

  // Architecture findings
  if (data.architecture.layerViolations.length > 0) {
    findings.push({
      id: "arch-layer-violations",
      severity: "high",
      category: "architecture",
      title: "Layer violations detected",
      description: `${data.architecture.layerViolations.length} layer violations found. Dependencies should point inward (domain → application → infrastructure).`,
      evidence: data.architecture.layerViolations.slice(0, 5),
      recommendation: "Refactor to follow hexagonal architecture. Domain should not depend on infrastructure.",
      effort: "medium",
      impact: "high",
    })
  }

  if (data.architecture.circularDependencies.length > 0) {
    findings.push({
      id: "arch-circular-deps",
      severity: "high",
      category: "architecture",
      title: "Circular dependencies detected",
      description: `${data.architecture.circularDependencies.length} circular dependencies create tight coupling.`,
      evidence: data.architecture.circularDependencies,
      recommendation: "Break cycles with dependency injection or shared interfaces.",
      effort: "hard",
      impact: "high",
    })
  }

  if (data.architecture.entryPoints.length > 3) {
    findings.push({
      id: "arch-many-entrypoints",
      severity: "medium",
      category: "architecture",
      title: "Too many entry points",
      description: `${data.architecture.entryPoints.length} entry points. Consider consolidating.`,
      evidence: data.architecture.entryPoints,
      recommendation: "Define a single entry point or clear module boundaries.",
      effort: "medium",
      impact: "medium",
    })
  }

  // Quality findings
  if (data.quality.testToSourceRatio < 0.2) {
    findings.push({
      id: "quality-low-tests",
      severity: "high",
      category: "testing",
      title: "Low test-to-source ratio",
      description: `Test/source ratio is ${(data.quality.testToSourceRatio * 100).toFixed(1)}%. Target: 30%+.`,
      evidence: [`Ratio: ${data.quality.testToSourceRatio}`],
      recommendation: "Add unit tests for critical paths. Target 30%+ test-to-source ratio.",
      effort: "medium",
      impact: "high",
    })
  }

  if (data.quality.errorHandling === "generic") {
    findings.push({
      id: "quality-generic-errors",
      severity: "medium",
      category: "error-handling",
      title: "Generic error handling",
      description: "Using generic catch blocks. Typed errors improve debuggability.",
      evidence: ["catch(e) without type annotations"],
      recommendation: "Define custom error types and use typed catch blocks.",
      effort: "easy",
      impact: "medium",
    })
  }

  if (data.quality.complexityScore > 5) {
    const godFiles = data.patterns.antiPatterns.filter(p => p.name === "God File")
    const deepNesting = data.patterns.antiPatterns.filter(p => p.name === "Deep Nesting")
    const evidence: string[] = []
    if (godFiles.length > 0) evidence.push(`${godFiles.length} god files (>300 lines)`)
    if (deepNesting.length > 0) evidence.push(`${deepNesting.length} deeply nested files`)
    findings.push({
      id: "quality-high-complexity",
      severity: "medium",
      category: "complexity",
      title: "High complexity score",
      description: `${data.quality.complexityScore} anti-patterns detected (${godFiles.length} god files, ${deepNesting.length} deep nesting). Consider refactoring.`,
      evidence,
      recommendation: "Break large files, reduce nesting, extract functions.",
      effort: "medium",
      impact: "medium",
    })
  }

  // Dependency findings
  if (data.dependencies.unused.length > 0) {
    findings.push({
      id: "deps-unused",
      severity: "low",
      category: "dependencies",
      title: "Unused dependencies",
      description: `${data.dependencies.unused.length} unused dependencies detected.`,
      evidence: data.dependencies.unused,
      recommendation: "Remove unused dependencies to reduce bundle size and attack surface.",
      effort: "easy",
      impact: "low",
    })
  }

  if (data.dependencies.vulnerable.length > 0) {
    findings.push({
      id: "deps-vulnerable",
      severity: "critical",
      category: "security",
      title: "Vulnerable dependencies",
      description: `${data.dependencies.vulnerable.length} dependencies with known vulnerabilities.`,
      evidence: data.dependencies.vulnerable,
      recommendation: "Update vulnerable dependencies immediately.",
      effort: "easy",
      impact: "high",
    })
  }

  // Style findings
  if (!data.patterns.conventions.includes("eslint")) {
    findings.push({
      id: "style-no-linter",
      severity: "low",
      category: "tooling",
      title: "No linter configured",
      description: "No ESLint configuration found.",
      evidence: [],
      recommendation: "Add ESLint for consistent code style and error detection.",
      effort: "trivial",
      impact: "low",
    })
  }

  if (!data.patterns.conventions.includes("typescript-strict")) {
    findings.push({
      id: "style-no-strict-ts",
      severity: "medium",
      category: "tooling",
      title: "No strict TypeScript",
      description: "tsconfig.json not found or not in strict mode.",
      evidence: [],
      recommendation: "Enable strict mode in tsconfig.json for better type safety.",
      effort: "trivial",
      impact: "medium",
    })
  }

  return findings
}

export function assessValue(data: ExtractedData, findings: AuditFinding[]): ValueAssessment {
  const severityScores = { critical: 10, high: 7, medium: 4, low: 2, info: 1 }
  const totalSeverity = findings.reduce((sum, f) => sum + severityScores[f.severity], 0)
  const maxPossible = findings.length * 10
  const overallScore = maxPossible > 0 ? Math.round(((maxPossible - totalSeverity) / maxPossible) * 100) : 50

  const dimensions: Record<string, number> = {
    architecture: data.architecture.layerViolations.length === 0 ? 9 : 5,
    testing: Math.min(10, Math.round(data.quality.testToSourceRatio * 30)),
    errorHandling: data.quality.errorHandling === "typed" ? 9 : data.quality.errorHandling === "mixed" ? 6 : 3,
    tooling: data.patterns.conventions.length >= 5 ? 8 : data.patterns.conventions.length >= 3 ? 6 : 4,
    dependencies: data.dependencies.unused.length === 0 ? 9 : 6,
    codeQuality: Math.max(1, 10 - data.patterns.antiPatterns.length),
  }

  const strengths: string[] = []
  const weaknesses: string[] = []
  if (dimensions.architecture >= 7) strengths.push("Clean architecture")
  else weaknesses.push("Architecture violations")
  if (dimensions.testing >= 7) strengths.push("Good test coverage")
  else weaknesses.push("Insufficient testing")
  if (dimensions.errorHandling >= 7) strengths.push("Typed error handling")
  else weaknesses.push("Generic error handling")
  if (dimensions.tooling >= 7) strengths.push("Good tooling setup")
  else weaknesses.push("Missing tooling")
  if (data.patterns.designPatterns.length > 0) strengths.push(`${data.patterns.designPatterns.length} design patterns used`)

  return {
    overallScore,
    dimensions,
    strengths,
    weaknesses,
    opportunities: [
      "Add more tests for critical paths",
      "Implement typed error handling",
      "Add CI/CD pipeline",
    ],
    threats: [
      `${findings.filter(f => f.severity === "critical").length} critical findings`,
      `${data.architecture.circularDependencies.length} circular dependencies`,
    ],
    roiEstimate: {
      developmentHours: findings.reduce((sum, f) => {
        const effortMap = { trivial: 0.5, easy: 2, medium: 8, hard: 24, epic: 80 }
        return sum + (effortMap[f.effort] || 4)
      }, 0),
      maintenanceMultiplier: 1.5,
      reusePotential: Math.min(10, Math.round(data.architecture.entryPoints.length * 2 + data.patterns.designPatterns.length)),
    },
  }
}
