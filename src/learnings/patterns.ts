import type { ExtractedData, DetectedPattern } from "./types"

export interface PatternInsight {
  pattern: DetectedPattern
  lesson: string
  applicableTo: string[]
  confidence: number
}

export function findPatterns(data: ExtractedData): PatternInsight[] {
  const insights: PatternInsight[] = []

  for (const pattern of data.patterns.designPatterns) {
    insights.push({
      pattern,
      lesson: `${pattern.name} pattern: ${pattern.description}. Consider applying this to similar problems.`,
      applicableTo: ["architecture", "refactoring"],
      confidence: pattern.confidence,
    })
  }

  for (const anti of data.patterns.antiPatterns) {
    insights.push({
      pattern: anti,
      lesson: `Avoid ${anti.name}: ${anti.description}. Refactor to reduce complexity.`,
      applicableTo: ["refactoring", "code-review"],
      confidence: anti.confidence,
    })
  }

  // Style-based insights
  const style = data.patterns.codingStyle
  insights.push({
    pattern: { name: "Coding Style", type: "architectural", locations: [], confidence: 0.9, description: `Uses ${style.indentStyle}, ${style.quoteStyle} quotes` },
    lesson: `Project uses ${style.indentStyle} with ${style.indentSize}-space indent and ${style.quoteStyle} quotes.`,
    applicableTo: ["code-style"],
    confidence: 0.9,
  })

  // Convention insights
  for (const conv of data.patterns.conventions) {
    insights.push({
      pattern: { name: conv, type: "architectural", locations: [], confidence: 0.95, description: `Has ${conv} configured` },
      lesson: `${conv} is configured — maintain it.`,
      applicableTo: ["tooling"],
      confidence: 0.95,
    })
  }

  // Error handling insight
  if (data.quality.errorHandling === "typed") {
    insights.push({
      pattern: { name: "Typed Errors", type: "architectural", locations: [], confidence: 0.9, description: "Uses typed error handling" },
      lesson: "Typed errors improve debuggability. Continue this pattern.",
      applicableTo: ["error-handling", "testing"],
      confidence: 0.9,
    })
  } else if (data.quality.errorHandling === "generic") {
    insights.push({
      pattern: { name: "Generic Errors", type: "anti", locations: [], confidence: 0.8, description: "Uses generic error handling" },
      lesson: "Generic catch blocks hide error types. Migrate to typed errors.",
      applicableTo: ["error-handling", "refactoring"],
      confidence: 0.8,
    })
  }

  return insights.sort((a, b) => b.confidence - a.confidence)
}

export function summarizePatterns(insights: PatternInsight[]): {
  topDesignPatterns: PatternInsight[]
  topAntiPatterns: PatternInsight[]
  styleSummary: string
  conventionSummary: string
} {
  const design = insights.filter(i => i.pattern.type === "design")
  const anti = insights.filter(i => i.pattern.type === "anti")

  return {
    topDesignPatterns: design.slice(0, 5),
    topAntiPatterns: anti.slice(0, 5),
    styleSummary: insights.filter(i => i.applicableTo.includes("code-style")).map(i => i.lesson).join("; "),
    conventionSummary: insights.filter(i => i.applicableTo.includes("tooling")).map(i => i.lesson).join("; "),
  }
}
