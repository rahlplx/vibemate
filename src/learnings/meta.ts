import type { ExtractedData, MetaLearning, ValueAssessment } from "./types"

export function generateMetaLearnings(
  data: ExtractedData,
  _findings: unknown[],
  value: ValueAssessment,
): MetaLearning[] {
  const learnings: MetaLearning[] = []

  // Architecture meta-learnings
  if (data.architecture.layerViolations.length === 0 && data.architecture.entryPoints.length > 0) {
    learnings.push({
      id: "meta-clean-arch",
      category: "architecture",
      insight: "Clean architecture with proper layer separation reduces coupling and improves testability.",
      evidence: [`${data.architecture.entryPoints.length} entry points`, "No layer violations"],
      confidence: 0.9,
      applicableTo: ["architecture", "new-projects"],
      source: "structural-analysis",
    })
  }

  if (data.architecture.circularDependencies.length > 0) {
    learnings.push({
      id: "meta-circular-deps",
      category: "architecture",
      insight: "Circular dependencies indicate tight coupling. Use dependency inversion to break cycles.",
      evidence: data.architecture.circularDependencies,
      confidence: 0.85,
      applicableTo: ["architecture", "refactoring"],
      source: "structural-analysis",
    })
  }

  // Testing meta-learnings
  if (data.quality.testToSourceRatio > 0.3) {
    learnings.push({
      id: "meta-good-testing",
      category: "testing",
      insight: "High test-to-source ratio correlates with fewer bugs and safer refactoring.",
      evidence: [`Ratio: ${(data.quality.testToSourceRatio * 100).toFixed(1)}%`],
      confidence: 0.9,
      applicableTo: ["testing", "quality"],
      source: "quality-analysis",
    })
  } else {
    learnings.push({
      id: "meta-low-testing",
      category: "testing",
      insight: "Low test coverage increases regression risk. Prioritize tests for critical paths.",
      evidence: [`Ratio: ${(data.quality.testToSourceRatio * 100).toFixed(1)}%`],
      confidence: 0.85,
      applicableTo: ["testing", "quality"],
      source: "quality-analysis",
    })
  }

  // Error handling meta-learnings
  if (data.quality.errorHandling === "typed") {
    learnings.push({
      id: "meta-typed-errors",
      category: "patterns",
      insight: "Typed errors enable exhaustive matching and improve debugging. Standardize error types.",
      evidence: ["All catch blocks use typed errors"],
      confidence: 0.9,
      applicableTo: ["error-handling", "api-design"],
      source: "quality-analysis",
    })
  }

  // Tooling meta-learnings
  const hasLinter = data.patterns.conventions.includes("eslint")
  const hasStrictTS = data.patterns.conventions.includes("typescript-strict")
  const hasCI = data.patterns.conventions.includes("ci-cd")

  if (hasLinter && hasStrictTS) {
    learnings.push({
      id: "meta-tooling-baseline",
      category: "tooling",
      insight: "ESLint + strict TypeScript catches errors at compile time, reducing runtime bugs.",
      evidence: ["ESLint configured", "Strict TypeScript enabled"],
      confidence: 0.9,
      applicableTo: ["tooling", "quality"],
      source: "convention-analysis",
    })
  }

  if (!hasCI) {
    learnings.push({
      id: "meta-missing-ci",
      category: "tooling",
      insight: "Without CI/CD, regressions accumulate. Automate testing and deployment.",
      evidence: ["No CI/CD configuration found"],
      confidence: 0.85,
      applicableTo: ["tooling", "process"],
      source: "convention-analysis",
    })
  }

  // Dependency meta-learnings
  if (data.dependencies.unused.length > 0) {
    learnings.push({
      id: "meta-unused-deps",
      category: "tooling",
      insight: "Unused dependencies increase bundle size and security surface. Audit regularly.",
      evidence: data.dependencies.unused,
      confidence: 0.8,
      applicableTo: ["dependencies", "security"],
      source: "dependency-analysis",
    })
  }

  // Pattern meta-learnings
  if (data.patterns.designPatterns.length > 2) {
    learnings.push({
      id: "meta-pattern-usage",
      category: "patterns",
      insight: `Project uses ${data.patterns.designPatterns.length} design patterns — indicates mature architecture.`,
      evidence: data.patterns.designPatterns.map(p => p.name),
      confidence: 0.8,
      applicableTo: ["architecture", "patterns"],
      source: "pattern-analysis",
    })
  }

  // Value meta-learnings
  if (value.overallScore >= 70) {
    learnings.push({
      id: "meta-high-value",
      category: "architecture",
      insight: "High overall quality score indicates maintainable, well-structured codebase.",
      evidence: [`Score: ${value.overallScore}/100`, `Strengths: ${value.strengths.join(", ")}`],
      confidence: 0.85,
      applicableTo: ["architecture", "quality"],
      source: "value-assessment",
    })
  }

  return learnings
}
