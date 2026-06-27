import { describe, it, expect } from "bun:test"
import {
  StateManager,
  createStateManager,
  PipelineState,
} from "../../src/state/auto-update"

describe("State Auto-Update", () => {
  it("creates state manager with default state", () => {
    const mgr = createStateManager()
    const state = mgr.getState()
    expect(state.phase).toBe("idle")
    expect(state.testResults.total).toBe(0)
  })

  it("advances phase", () => {
    const mgr = createStateManager()
    mgr.advancePhase("break")
    expect(mgr.getState().phase).toBe("break")
  })

  it("records test results", () => {
    const mgr = createStateManager()
    mgr.updateTestResults({ total: 100, passing: 99, failing: 1, skipped: 0 })
    const state = mgr.getState()
    expect(state.testResults.total).toBe(100)
    expect(state.testResults.passing).toBe(99)
  })

  it("records harness checks", () => {
    const mgr = createStateManager()
    mgr.recordHarnessCheck("typescript", "PASS")
    mgr.recordHarnessCheck("tests", "PASS")
    expect(mgr.getState().harnessChecks.typescript).toBe("PASS")
    expect(mgr.getState().harnessChecks.tests).toBe("PASS")
  })

  it("marks slices as completed", () => {
    const mgr = createStateManager()
    mgr.completeSlice("S08")
    mgr.completeSlice("S09")
    expect(mgr.getState().completed).toContain("S08")
    expect(mgr.getState().completed).toContain("S09")
  })

  it("prevents duplicate slice completion", () => {
    const mgr = createStateManager()
    mgr.completeSlice("S08")
    mgr.completeSlice("S08")
    expect(mgr.getState().completed.filter(c => c === "S08")).toHaveLength(1)
  })

  it("serializes to JSON", () => {
    const mgr = createStateManager()
    mgr.advancePhase("build")
    mgr.updateTestResults({ total: 50, passing: 50, failing: 0, skipped: 0 })
    const json = mgr.toJSON()
    expect(json).toContain("build")
    expect(json).toContain("50")
  })

  it("deserializes from JSON", () => {
    const mgr = createStateManager()
    mgr.advancePhase("harness")
    mgr.updateTestResults({ total: 75, passing: 75, failing: 0, skipped: 0 })
    const json = mgr.toJSON()

    const mgr2 = createStateManager(json)
    expect(mgr2.getState().phase).toBe("harness")
    expect(mgr2.getState().testResults.total).toBe(75)
  })

  it("tracks last update time", () => {
    const mgr = createStateManager()
    const before = Date.now()
    mgr.advancePhase("build")
    const state = mgr.getState()
    expect(new Date(state.lastUpdate).getTime()).toBeGreaterThanOrEqual(before)
  })

  it("provides completion percentage", () => {
    const mgr = createStateManager()
    mgr.completeSlice("S01")
    mgr.completeSlice("S02")
    mgr.completeSlice("S03")
    expect(mgr.getCompletionPercent()).toBeGreaterThan(0)
  })
})
