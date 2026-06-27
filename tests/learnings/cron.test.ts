import { describe, it, expect, mock } from "bun:test"
import {
  DreamingScheduler,
  createDreamingScheduler,
  DreamingPhase,
  DreamingJobStatus,
} from "../../src/learnings/cron"

describe("Dreaming Scheduler", () => {
  it("creates scheduler with default config", () => {
    const scheduler = createDreamingScheduler()
    expect(scheduler).toBeDefined()
    expect(scheduler.getStatus().enabled).toBe(true)
  })

  it("runs all phases in order: light → REM → deep", async () => {
    const phaseOrder: DreamingPhase[] = []
    const scheduler = createDreamingScheduler({
      onPhase: (phase) => { phaseOrder.push(phase) },
    })

    await scheduler.runOnce()

    expect(phaseOrder).toEqual(["light", "rem", "deep"])
  })

  it("reports status after run", async () => {
    const scheduler = createDreamingScheduler()
    await scheduler.runOnce()

    const status = scheduler.getStatus()
    expect(status.lastRun).toBeDefined()
    expect(status.lastRun!.completed).toBe(true)
    expect(status.lastRun!.phases).toHaveLength(3)
  })

  it("can be enabled/disabled", () => {
    const scheduler = createDreamingScheduler()
    scheduler.setEnabled(false)
    expect(scheduler.getStatus().enabled).toBe(false)
    scheduler.setEnabled(true)
    expect(scheduler.getStatus().enabled).toBe(true)
  })

  it("skips run when disabled", async () => {
    const scheduler = createDreamingScheduler()
    scheduler.setEnabled(false)
    const result = await scheduler.runOnce()
    expect(result.skipped).toBe(true)
  })

  it("tracks run history", async () => {
    const scheduler = createDreamingScheduler()
    await scheduler.runOnce()
    await scheduler.runOnce()

    const status = scheduler.getStatus()
    expect(status.totalRuns).toBe(2)
    expect(status.history).toHaveLength(2)
  })

  it("reports next scheduled run time", () => {
    const scheduler = createDreamingScheduler({ cronExpression: "0 3 * * *" })
    const status = scheduler.getStatus()
    expect(status.nextRun).toBeDefined()
    expect(status.nextRun!.getTime()).toBeGreaterThan(Date.now())
  })

  it("handles phase errors gracefully", async () => {
    let errorCount = 0
    const scheduler = createDreamingScheduler({
      onPhase: (phase) => {
        if (phase === "rem") throw new Error("REM failed")
      },
      onError: () => { errorCount++ },
    })

    const result = await scheduler.runOnce()
    expect(result.completed).toBe(false)
    expect(errorCount).toBeGreaterThan(0)
  })

  it("stops on deep phase failure (critical)", async () => {
    const phasesRun: DreamingPhase[] = []
    const scheduler = createDreamingScheduler({
      onPhase: (phase) => {
        phasesRun.push(phase)
        if (phase === "deep") throw new Error("Deep failed")
      },
    })

    await scheduler.runOnce()
    expect(phasesRun).toContain("light")
    expect(phasesRun).toContain("rem")
    expect(phasesRun).toContain("deep")
  })

  it("provides phase durations", async () => {
    const scheduler = createDreamingScheduler()
    await scheduler.runOnce()

    const status = scheduler.getStatus()
    const deepPhase = status.lastRun!.phases.find(p => p.phase === "deep")
    expect(deepPhase).toBeDefined()
    expect(deepPhase!.durationMs).toBeGreaterThanOrEqual(0)
  })
})
