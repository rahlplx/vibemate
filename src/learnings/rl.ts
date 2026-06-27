import type { ExtractedData, RLSignal, ValueAssessment } from "./types"

export function generateRLSignals(
  data: ExtractedData,
  _findings: unknown[],
  value: ValueAssessment,
): RLSignal[] {
  const signals: RLSignal[] = []

  // Reward: clean architecture
  if (data.architecture.layerViolations.length === 0) {
    signals.push({
      id: "rl-clean-arch",
      action: "maintain-hexagonal-architecture",
      reward: 1.0,
      context: "No layer violations detected",
      outcome: "Clean separation of concerns",
      learnings: ["Hexagonal architecture pays off in maintainability", "Layer enforcement prevents coupling"],
    })
  } else {
    signals.push({
      id: "rl-layer-violations",
      action: "enforce-layer-boundaries",
      reward: -0.5,
      context: `${data.architecture.layerViolations.length} layer violations`,
      outcome: "Increased coupling risk",
      learnings: ["Layer violations accumulate silently", "Automated lint rules can prevent regressions"],
    })
  }

  // Reward: testing
  const testRatio = data.quality.testToSourceRatio
  if (testRatio > 0.3) {
    signals.push({
      id: "rl-good-tests",
      action: "write-comprehensive-tests",
      reward: 1.0,
      context: `Test ratio: ${(testRatio * 100).toFixed(1)}%`,
      outcome: "High confidence in changes",
      learnings: ["Tests enable fearless refactoring", "Test-first catches design issues early"],
    })
  } else if (testRatio < 0.1) {
    signals.push({
      id: "rl-no-tests",
      action: "add-test-infrastructure",
      reward: -0.8,
      context: `Test ratio: ${(testRatio * 100).toFixed(1)}%`,
      outcome: "High regression risk",
      learnings: ["No tests = no safety net", "Start with integration tests for critical paths"],
    })
  }

  // Reward: error handling
  if (data.quality.errorHandling === "typed") {
    signals.push({
      id: "rl-typed-errors",
      action: "use-typed-error-handling",
      reward: 0.8,
      context: "All errors are typed",
      outcome: "Exhaustive error matching possible",
      learnings: ["Typed errors prevent missed cases", "Error types serve as documentation"],
    })
  } else if (data.quality.errorHandling === "generic") {
    signals.push({
      id: "rl-generic-errors",
      action: "migrate-to-typed-errors",
      reward: -0.6,
      context: "Generic catch blocks found",
      outcome: "Errors may be silently swallowed",
      learnings: ["Generic catches hide bugs", "TypeScript union types model error states well"],
    })
  }

  // Reward: tooling
  const toolScore = data.patterns.conventions.length / 9
  signals.push({
    id: "rl-tooling",
    action: "configure-development-tooling",
    reward: Math.max(-1, Math.min(1, toolScore - 0.3)),
    context: `${data.patterns.conventions.length} conventions configured`,
    outcome: toolScore > 0.5 ? "Good dev experience" : "Missing tooling overhead",
    learnings: [
      "Tooling compounds over time",
      "ESLint + Prettier + strict TS is the baseline",
      "CI/CD prevents regression accumulation",
    ],
  })

  // Reward: dependencies
  if (data.dependencies.unused.length === 0) {
    signals.push({
      id: "rl-clean-deps",
      action: "audit-dependencies",
      reward: 0.5,
      context: "No unused dependencies",
      outcome: "Lean dependency tree",
      learnings: ["Regular dependency audits prevent bloat", "Unused deps are security risks"],
    })
  } else {
    signals.push({
      id: "rl-unused-deps",
      action: "remove-unused-deps",
      reward: -0.3,
      context: `${data.dependencies.unused.length} unused dependencies`,
      outcome: "Increased bundle size and attack surface",
      learnings: ["deps-check should be part of CI", "Unused deps accumulate silently"],
    })
  }

  // Reward: complexity
  const antiCount = data.patterns.antiPatterns.length
  if (antiCount === 0) {
    signals.push({
      id: "rl-low-complexity",
      action: "maintain-simple-code",
      reward: 0.7,
      context: "No anti-patterns detected",
      outcome: "Easy to understand and modify",
      learnings: ["Simplicity is a feature", "Code reviews catch complexity early"],
    })
  } else {
    signals.push({
      id: "rl-high-complexity",
      action: "reduce-complexity",
      reward: -0.4 * Math.min(antiCount, 5),
      context: `${antiCount} anti-patterns found`,
      outcome: "Increased cognitive load",
      learnings: ["God files are the #1 anti-pattern", "Extract functions before files get too long"],
    })
  }

  // Aggregate reward
  const totalReward = signals.reduce((sum, s) => sum + s.reward, 0)
  signals.push({
    id: "rl-aggregate",
    action: "overall-quality",
    reward: Math.max(-1, Math.min(1, totalReward / signals.length)),
    context: `Aggregate from ${signals.length} signals`,
    outcome: value.overallScore >= 70 ? "Healthy codebase" : "Needs improvement",
    learnings: [
      "Quality compounds — invest early",
      "Automated checks > manual reviews",
      "Test + type + lint = safety net trifecta",
    ],
  })

  return signals
}
