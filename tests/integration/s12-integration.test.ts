import { describe, it, expect } from "bun:test"
import { createDreamingScheduler } from "../../src/learnings/cron"
import { createMemorySearchEngine } from "../../src/learnings/search"
import { createRuleEngine } from "../../src/learnings/rules"
import { createStateManager } from "../../src/state/auto-update"
import { buildShortTermRecalls, assessMemoryHealth, getTopWorkflows, getTopSkills } from "../../src/learnings/evidence"
import { calculatePromotionScore, calculateTemporalDecay } from "../../src/learnings/dreaming"

describe("S12: End-to-End Integration", () => {
  it("dreaming → evidence → search → rules pipeline", async () => {
    const scheduler = createDreamingScheduler()
    const search = createMemorySearchEngine()
    const rules = createRuleEngine()
    const state = createStateManager()

    state.advancePhase("build")

    const result = await scheduler.runOnce()
    expect(result.completed).toBe(true)
    expect(result.phases).toHaveLength(3)

    const evidence = buildShortTermRecalls()
    expect(evidence.length).toBeGreaterThan(0)

    search.index(evidence.map(e => ({ id: e.key, content: e.snippet, tags: e.conceptTags })))
    const searchResults = search.search("tdd")
    expect(searchResults.length).toBeGreaterThan(0)

    const topWorkflows = getTopWorkflows(3)
    const proposals = rules.propose(
      topWorkflows.map(w => ({ key: w.workflow, score: w.successRate, evidence: [`${w.totalRuns} runs`] }))
    )
    expect(proposals.length).toBeGreaterThan(0)

    const approved = rules.approve(proposals[0].id)
    expect(approved).toBe(true)
    expect(rules.getRules().length).toBe(1)

    state.completeSlice("S08")
    state.completeSlice("S09")
    state.completeSlice("S10")
    state.recordHarnessCheck("tests", "PASS")
    state.updateTestResults({ total: 950, passing: 950, failing: 0, skipped: 0 })

    const summary = rules.getSummary()
    expect(summary.approved).toBe(1)

    const health = assessMemoryHealth(evidence)
    expect(health.totalEntries).toBeGreaterThan(0)
  })

  it("handles full lifecycle: index → search → recall → promote", () => {
    const search = createMemorySearchEngine()
    const entries = buildShortTermRecalls()

    search.index(entries.map(e => ({ id: e.key, content: e.snippet, tags: e.conceptTags })))

    const results = search.search("success")
    expect(results.length).toBeGreaterThan(0)

    const scores = entries.map(e => ({
      key: e.key,
      score: calculatePromotionScore(e, { nowMs: Date.now(), halfLifeDays: 30 }).total,
      snippet: e.snippet,
    }))

    const promoted = scores.filter(s => s.score > 0.5)
    expect(promoted.length).toBeGreaterThan(0)
  })

  it("temporal decay works across time ranges", () => {
    for (let age = 0; age <= 365; age += 30) {
      const d = calculateTemporalDecay(age, 30)
      expect(d).toBeGreaterThanOrEqual(0)
      expect(d).toBeLessThanOrEqual(1)
    }
  })
})

describe("S12: Simulation Loop (100 iterations)", () => {
  it("all modules stable under load", () => {
    let pass = 0
    let fail = 0

    for (let i = 0; i < 100; i++) {
      const scheduler = createDreamingScheduler()
      const search = createMemorySearchEngine()
      const rules = createRuleEngine()
      const state = createStateManager()

      state.advancePhase("build")
      state.updateTestResults({ total: 900 + i, passing: 900 + i, failing: 0, skipped: 0 })
      state.completeSlice(`S${8 + (i % 5)}`)

      const entries = buildShortTermRecalls()
      search.index(entries.map(e => ({ id: e.key, content: e.snippet, tags: e.conceptTags })))
      const results = search.search("tdd")

      if (results.length > 0 && state.getState().testResults.total > 0) pass++
      else fail++
    }

    expect(fail).toBe(0)
    expect(pass).toBe(100)
  })
})
