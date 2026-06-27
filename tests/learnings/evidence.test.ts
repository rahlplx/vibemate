import { describe, it, expect } from "bun:test"
import {
  buildShortTermRecalls,
  getWorkflowEvidence,
  getSkillEffectiveness,
  getToolIssues,
  assessMemoryHealth,
  getTopWorkflows,
  getTopSkills,
  getFrequentToolIssues,
} from "../../src/learnings/evidence"

describe("Workflow Evidence", () => {
  it("builds short-term recalls from workflow evidence", () => {
    const recalls = buildShortTermRecalls()
    expect(recalls.length).toBeGreaterThan(0)
    expect(recalls.every(r => r.key.length > 0)).toBe(true)
  })

  it("includes workflow entries", () => {
    const evidence = getWorkflowEvidence()
    expect(evidence.some(w => w.workflow === "tdd")).toBe(true)
    expect(evidence.some(w => w.workflow === "reference-repo-analysis")).toBe(true)
  })

  it("returns top workflows by value", () => {
    const top = getTopWorkflows(3)
    expect(top.length).toBe(3)
    expect(top[0].successRate).toBeGreaterThanOrEqual(top[1].successRate)
  })
})

describe("Skill Effectiveness", () => {
  it("has all skills with scores", () => {
    const skills = getSkillEffectiveness()
    expect(skills.length).toBeGreaterThan(0)
    expect(skills.every(s => s.score > 0)).toBe(true)
  })

  it("returns top skills by score", () => {
    const top = getTopSkills(3)
    expect(top.length).toBe(3)
    expect(top[0].score).toBeGreaterThanOrEqual(top[1].score)
  })

  it("tdd is top skill", () => {
    const top = getTopSkills(1)
    expect(top[0].skill).toBe("tdd")
  })
})

describe("Tool Issues", () => {
  it("tracks tool issues with workarounds", () => {
    const issues = getToolIssues()
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every(i => i.workaround.length > 0)).toBe(true)
  })

  it("returns frequent issues first", () => {
    const top = getFrequentToolIssues(3)
    expect(top.length).toBe(3)
    expect(top[0].frequency).toBeGreaterThanOrEqual(top[1].frequency)
  })
})

describe("Memory Health", () => {
  it("assessess memory health from recalls", () => {
    const recalls = buildShortTermRecalls()
    const health = assessMemoryHealth(recalls)
    expect(health.totalEntries).toBe(recalls.length)
    expect(health.avgStrength).toBeGreaterThanOrEqual(0)
    expect(health.avgStrength).toBeLessThanOrEqual(1)
  })

  it("identifies stale entries", () => {
    const recalls = buildShortTermRecalls()
    const health = assessMemoryHealth(recalls)
    expect(health.staleCount).toBeGreaterThanOrEqual(0)
  })

  it("identifies promotion candidates", () => {
    const recalls = buildShortTermRecalls()
    const health = assessMemoryHealth(recalls)
    expect(health.promotionCandidates).toBeGreaterThanOrEqual(0)
  })
})
