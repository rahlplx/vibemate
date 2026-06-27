import { describe, it, expect } from "bun:test"
import { generateSpec, formatPlan } from "../../src/learnings/generator"
import type { AuditFinding, ValueAssessment, MetaLearning, RLSignal } from "../../src/learnings/types"

const mockFindings: AuditFinding[] = [
  {
    id: "test-1", severity: "critical", category: "security",
    title: "Critical security issue", description: "XSS vulnerability",
    evidence: ["line 42"], recommendation: "Sanitize input", effort: "medium", impact: "high",
  },
  {
    id: "test-2", severity: "high", category: "architecture",
    title: "Layer violation", description: "Domain imports infrastructure",
    evidence: ["file.ts:10"], recommendation: "Use DI", effort: "easy", impact: "medium",
  },
  {
    id: "test-3", severity: "medium", category: "testing",
    title: "Low test coverage", description: "Only 5% test ratio",
    evidence: [], recommendation: "Add tests", effort: "medium", impact: "high",
  },
  {
    id: "test-4", severity: "low", category: "tooling",
    title: "Missing linter", description: "No ESLint config",
    evidence: [], recommendation: "Add ESLint", effort: "trivial", impact: "low",
  },
]

const mockValue: ValueAssessment = {
  overallScore: 55,
  dimensions: { architecture: 6, testing: 3, tooling: 4 },
  strengths: ["Some good patterns"],
  weaknesses: ["Low testing", "No linter"],
  opportunities: ["Add tests"],
  threats: ["1 critical finding"],
  roiEstimate: { developmentHours: 40, maintenanceMultiplier: 1.5, reusePotential: 6 },
}

const mockMeta: MetaLearning[] = [
  {
    id: "m1", category: "testing", insight: "Tests enable fearless refactoring",
    evidence: ["ratio: 5%"], confidence: 0.9, applicableTo: ["testing"], source: "analysis",
  },
]

const mockRL: RLSignal[] = [
  {
    id: "rl1", action: "write-tests", reward: 0.8, context: "Low test ratio",
    outcome: "High regression risk", learnings: ["Start with integration tests"],
  },
]

describe("generateSpec", () => {
  it("generates spec from findings", () => {
    const spec = generateSpec(mockFindings, mockValue, mockMeta, mockRL)
    expect(spec.id).toBeTruthy()
    expect(spec.title).toBeTruthy()
    expect(spec.slices.length).toBeGreaterThan(0)
    expect(spec.estimatedEffort).toBeGreaterThan(0)
  })

  it("sorts findings by severity", () => {
    const spec = generateSpec(mockFindings, mockValue, mockMeta, mockRL)
    const firstSliceTasks = spec.slices[0]?.tasks || []
    expect(firstSliceTasks.length).toBeGreaterThan(0)
  })

  it("groups findings by category", () => {
    const spec = generateSpec(mockFindings, mockValue, mockMeta, mockRL)
    const categories = spec.slices.map(s => s.title.toLowerCase())
    expect(categories.some(c => c.includes("security"))).toBe(true)
    expect(categories.some(c => c.includes("architecture"))).toBe(true)
  })

  it("generates tasks for each finding", () => {
    const spec = generateSpec(mockFindings, mockValue, mockMeta, mockRL)
    const totalTasks = spec.slices.reduce((sum, s) => sum + s.tasks.length, 0)
    expect(totalTasks).toBeGreaterThanOrEqual(mockFindings.length * 4)
  })

  it("each task has acceptance criteria", () => {
    const spec = generateSpec(mockFindings, mockValue, mockMeta, mockRL)
    for (const slice of spec.slices) {
      for (const task of slice.tasks) {
        expect(task.acceptanceCriteria.length).toBeGreaterThan(0)
      }
    }
  })

  it("includes meta-learning slice", () => {
    const spec = generateSpec(mockFindings, mockValue, mockMeta, mockRL)
    const metaSlice = spec.slices.find(s => s.id === "slice-meta")
    expect(metaSlice).toBeDefined()
    expect(metaSlice!.tasks.length).toBeGreaterThan(0)
  })

  it("calculates risk per slice", () => {
    const spec = generateSpec(mockFindings, mockValue, mockMeta, mockRL)
    for (const slice of spec.slices) {
      expect(["low", "medium", "high"]).toContain(slice.risk)
    }
  })

  it("sets priority based on severity", () => {
    const spec = generateSpec(mockFindings, mockValue, mockMeta, mockRL)
    expect(spec.priority).toBeGreaterThanOrEqual(7)
  })
})

describe("formatPlan", () => {
  it("formats plan as markdown", () => {
    const spec = generateSpec(mockFindings, mockValue, mockMeta, mockRL)
    const markdown = formatPlan(spec)
    expect(markdown).toContain("#")
    expect(markdown).toContain("Estimated effort")
    expect(markdown).toContain("|")
  })

  it("includes task checkboxes", () => {
    const spec = generateSpec(mockFindings, mockValue, mockMeta, mockRL)
    const markdown = formatPlan(spec)
    expect(markdown).toContain("- [ ]")
  })

  it("includes slice headers", () => {
    const spec = generateSpec(mockFindings, mockValue, mockMeta, mockRL)
    const markdown = formatPlan(spec)
    expect(markdown).toContain("##")
  })
})
