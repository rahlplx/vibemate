import { describe, it, expect } from "bun:test"
import {
  RuleEngine,
  createRuleEngine,
  RuleProposal,
  RuleChange,
  RuleStatus,
} from "../../src/learnings/rules"

describe("Rule Engine", () => {
  it("creates rule engine with empty rules", () => {
    const engine = createRuleEngine()
    expect(engine).toBeDefined()
    expect(engine.getRules()).toHaveLength(0)
  })

  it("proposes rule changes from evidence", () => {
    const engine = createRuleEngine()
    const proposals = engine.propose([
      { key: "workflow:tdd", score: 0.95, evidence: ["889 tests pass"] },
      { key: "workflow:reference-repo-analysis", score: 0.9, evidence: ["12 gaps found"] },
    ])
    expect(proposals.length).toBeGreaterThan(0)
    expect(proposals[0].status).toBe("pending")
  })

  it("approves rule changes", () => {
    const engine = createRuleEngine()
    const proposals = engine.propose([
      { key: "workflow:tdd", score: 0.95, evidence: ["889 tests pass"] },
    ])
    const approved = engine.approve(proposals[0].id)
    expect(approved).toBe(true)
    expect(engine.getRules().length).toBe(1)
  })

  it("rejects rule changes", () => {
    const engine = createRuleEngine()
    const proposals = engine.propose([
      { key: "workflow:tdd", score: 0.95, evidence: ["889 tests pass"] },
    ])
    const rejected = engine.reject(proposals[0].id)
    expect(rejected).toBe(true)
    expect(engine.getRules()).toHaveLength(0)
  })

  it("lists pending proposals", () => {
    const engine = createRuleEngine()
    engine.propose([
      { key: "workflow:a", score: 0.8, evidence: [] },
      { key: "workflow:b", score: 0.9, evidence: [] },
    ])
    expect(engine.getPending().length).toBe(2)
  })

  it("tracks proposal history", () => {
    const engine = createRuleEngine()
    const proposals = engine.propose([
      { key: "workflow:a", score: 0.8, evidence: [] },
    ])
    engine.approve(proposals[0].id)
    engine.propose([
      { key: "workflow:b", score: 0.9, evidence: [] },
    ])

    const history = engine.getHistory()
    expect(history.length).toBe(2)
    expect(history.some(h => h.status === "approved")).toBe(true)
    expect(history.some(h => h.status === "pending")).toBe(true)
  })

  it("rejects proposals below threshold", () => {
    const engine = createRuleEngine({ minScore: 0.8 })
    const proposals = engine.propose([
      { key: "workflow:weak", score: 0.3, evidence: [] },
    ])
    expect(proposals).toHaveLength(0)
  })

  it("prevents duplicate rules", () => {
    const engine = createRuleEngine()
    const p1 = engine.propose([{ key: "workflow:tdd", score: 0.95, evidence: [] }])
    engine.approve(p1[0].id)
    const p2 = engine.propose([{ key: "workflow:tdd", score: 0.95, evidence: [] }])
    expect(p2).toHaveLength(0)
    expect(engine.getRules()).toHaveLength(1)
  })

  it("provides rule summary", () => {
    const engine = createRuleEngine()
    engine.propose([{ key: "workflow:a", score: 0.9, evidence: [] }])
    engine.propose([{ key: "workflow:b", score: 0.8, evidence: [] }])
    const summary = engine.getSummary()
    expect(summary.total).toBe(2)
    expect(summary.pending).toBe(2)
    expect(summary.approved).toBe(0)
  })
})
