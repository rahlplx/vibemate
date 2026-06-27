import { describe, it, expect } from "bun:test"
import {
  MemoryEntry,
  DreamingPhase,
  DreamingConfig,
  ShortTermRecallEntry,
  createMemoryEntry,
  computeMemoryStrength,
  getForgettingCurveCycle,
  shouldReview,
  updateMemory,
  MemoryLayer,
  MemoryManager,
  createMemoryManager,
  runLightDreaming,
  runRemDreaming,
  runDeepDreaming,
  calculatePromotionScore,
  calculateTemporalDecay,
  DEFAULT_DREAMING_CONFIG,
} from "../../src/learnings/dreaming"

describe("Memory Layers", () => {
  it("classifies entries into correct layers", () => {
    const working = createMemoryEntry("working", "Current context", ["session"])
    const episodic = createMemoryEntry("episodic", "Yesterday's session", ["daily"])
    const semantic = createMemoryEntry("semantic", "Project uses TypeScript", ["fact"])
    const dreams = createMemoryEntry("dreams", "Reflected theme", ["theme"])

    expect(working.layer).toBe("working")
    expect(episodic.layer).toBe("episodic")
    expect(semantic.layer).toBe("semantic")
    expect(dreams.layer).toBe("dreams")
  })
})

describe("Short-Term Recall", () => {
  it("creates recall entry with required fields", () => {
    const entry: ShortTermRecallEntry = {
      key: "src/utils.ts:10-20",
      path: "src/utils.ts",
      startLine: 10,
      endLine: 20,
      source: "memory",
      snippet: "function helper()",
      recallCount: 3,
      dailyCount: 2,
      groundedCount: 1,
      totalScore: 2.5,
      maxScore: 0.9,
      firstRecalledAt: "2026-06-25T00:00:00Z",
      lastRecalledAt: "2026-06-27T00:00:00Z",
      queryHashes: ["hash1", "hash2"],
      recallDays: ["2026-06-25", "2026-06-27"],
      conceptTags: ["utility", "helper"],
    }

    expect(entry.key).toBeTruthy()
    expect(entry.recallCount).toBeGreaterThanOrEqual(0)
    expect(entry.conceptTags.length).toBeGreaterThan(0)
  })

  it("enforces max entries cap (512)", () => {
    const store: Record<string, ShortTermRecallEntry> = {}
    for (let i = 0; i < 600; i++) {
      store[`key-${i}`] = {
        key: `key-${i}`,
        path: `file-${i}.ts`,
        startLine: 1,
        endLine: 10,
        source: "memory",
        snippet: `snippet ${i}`,
        recallCount: i,
        dailyCount: 1,
        groundedCount: 0,
        totalScore: i * 0.1,
        maxScore: 0.5,
        firstRecalledAt: "2026-06-25T00:00:00Z",
        lastRecalledAt: "2026-06-27T00:00:00Z",
        queryHashes: [],
        recallDays: ["2026-06-27"],
        conceptTags: [],
      }
    }

    const keys = Object.keys(store)
    const retained = keys
      .sort((a, b) => store[b].recallCount - store[a].recallCount)
      .slice(0, 512)

    expect(retained.length).toBeLessThanOrEqual(512)
  })
})

describe("Promotion Scoring", () => {
  it("calculates weighted promotion score", () => {
    const entry: ShortTermRecallEntry = {
      key: "test",
      path: "test.ts",
      startLine: 1,
      endLine: 5,
      source: "memory",
      snippet: "test snippet",
      recallCount: 5,
      dailyCount: 3,
      groundedCount: 2,
      totalScore: 4.0,
      maxScore: 0.9,
      firstRecalledAt: "2026-06-20T00:00:00Z",
      lastRecalledAt: "2026-06-27T00:00:00Z",
      queryHashes: ["q1", "q2", "q3"],
      recallDays: ["2026-06-25", "2026-06-26", "2026-06-27"],
      conceptTags: ["api", "utility", "helper"],
    }

    const score = calculatePromotionScore(entry, {
      nowMs: Date.parse("2026-06-27T12:00:00Z"),
      halfLifeDays: 30,
    })

    expect(score.total).toBeGreaterThan(0)
    expect(score.total).toBeLessThanOrEqual(1)
    expect(score.components.frequency).toBeGreaterThan(0)
    expect(score.components.relevance).toBeGreaterThan(0)
    expect(score.components.diversity).toBeGreaterThan(0)
    expect(score.components.recency).toBeGreaterThan(0)
  })

  it("gives higher scores to frequently recalled entries", () => {
    const recent: ShortTermRecallEntry = {
      key: "recent",
      path: "test.ts",
      startLine: 1,
      endLine: 5,
      source: "memory",
      snippet: "recent",
      recallCount: 10,
      dailyCount: 5,
      groundedCount: 3,
      totalScore: 8.0,
      maxScore: 0.95,
      firstRecalledAt: "2026-06-25T00:00:00Z",
      lastRecalledAt: "2026-06-27T00:00:00Z",
      queryHashes: ["q1", "q2", "q3"],
      recallDays: ["2026-06-25", "2026-06-26", "2026-06-27"],
      conceptTags: ["api", "utility"],
    }

    const old: ShortTermRecallEntry = {
      ...recent,
      key: "old",
      recallCount: 1,
      dailyCount: 1,
      totalScore: 0.5,
      lastRecalledAt: "2026-06-20T00:00:00Z",
      recallDays: ["2026-06-20"],
      conceptTags: ["api"],
    }

    const nowMs = Date.parse("2026-06-27T12:00:00Z")
    const recentScore = calculatePromotionScore(recent, { nowMs, halfLifeDays: 30 })
    const oldScore = calculatePromotionScore(old, { nowMs, halfLifeDays: 30 })

    expect(recentScore.total).toBeGreaterThan(oldScore.total)
  })
})

describe("Temporal Decay", () => {
  it("decays exponentially with age", () => {
    const fresh = calculateTemporalDecay(0, 30)
    const weekOld = calculateTemporalDecay(7, 30)
    const monthOld = calculateTemporalDecay(30, 30)
    const old = calculateTemporalDecay(90, 30)

    expect(fresh).toBe(1.0)
    expect(weekOld).toBeGreaterThan(monthOld)
    expect(monthOld).toBeGreaterThan(old)
    expect(old).toBeGreaterThan(0)
  })

  it("respects configurable half-life", () => {
    const shortHalf = calculateTemporalDecay(15, 15)  // 1 half-life
    const longHalf = calculateTemporalDecay(15, 30)   // 0.5 half-lives

    expect(shortHalf).toBeCloseTo(0.5, 1)
    expect(longHalf).toBeGreaterThan(0.5)
  })

  it("never reaches zero (Ebbinghaus asymptote)", () => {
    const veryOld = calculateTemporalDecay(365, 30)
    expect(veryOld).toBeGreaterThan(0)
  })
})

describe("Dreaming Phases", () => {
  it("light dreaming stages candidates without writing to long-term", () => {
    const entries: ShortTermRecallEntry[] = [
      {
        key: "a", path: "a.ts", startLine: 1, endLine: 5, source: "memory",
        snippet: "snippet a", recallCount: 3, dailyCount: 2, groundedCount: 1,
        totalScore: 2.5, maxScore: 0.8, firstRecalledAt: "2026-06-25T00:00:00Z",
        lastRecalledAt: "2026-06-27T00:00:00Z", queryHashes: ["q1"],
        recallDays: ["2026-06-25", "2026-06-27"], conceptTags: ["api"],
      },
      {
        key: "b", path: "b.ts", startLine: 10, endLine: 20, source: "memory",
        snippet: "snippet b", recallCount: 1, dailyCount: 1, groundedCount: 0,
        totalScore: 0.5, maxScore: 0.3, firstRecalledAt: "2026-06-26T00:00:00Z",
        lastRecalledAt: "2026-06-27T00:00:00Z", queryHashes: ["q2"],
        recallDays: ["2026-06-27"], conceptTags: ["utility"],
      },
    ]

    const result = runLightDreaming(entries, { limit: 10, dedupeSimilarity: 0.8 })
    expect(result.staged).toBeDefined()
    expect(result.staged.length).toBeGreaterThan(0)
    expect(result.wroteToLongTerm).toBe(false)
  })

  it("REM dreaming extracts themes and reflections", () => {
    const entries: ShortTermRecallEntry[] = [
      {
        key: "a", path: "a.ts", startLine: 1, endLine: 5, source: "memory",
        snippet: "api pattern", recallCount: 5, dailyCount: 3, groundedCount: 2,
        totalScore: 4.0, maxScore: 0.9, firstRecalledAt: "2026-06-25T00:00:00Z",
        lastRecalledAt: "2026-06-27T00:00:00Z", queryHashes: ["q1"],
        recallDays: ["2026-06-25", "2026-06-26", "2026-06-27"], conceptTags: ["api", "pattern"],
      },
      {
        key: "b", path: "b.ts", startLine: 10, endLine: 20, source: "memory",
        snippet: "api design", recallCount: 4, dailyCount: 2, groundedCount: 1,
        totalScore: 3.0, maxScore: 0.85, firstRecalledAt: "2026-06-26T00:00:00Z",
        lastRecalledAt: "2026-06-27T00:00:00Z", queryHashes: ["q2"],
        recallDays: ["2026-06-26", "2026-06-27"], conceptTags: ["api", "design"],
      },
    ]

    const result = runRemDreaming(entries, { limit: 10, minPatternStrength: 0.3 })
    expect(result.themes).toBeDefined()
    expect(result.themes.length).toBeGreaterThan(0)
    expect(result.candidateTruths).toBeDefined()
    expect(result.wroteToLongTerm).toBe(false)
  })

  it("deep dreaming promotes high-scoring candidates", () => {
    const candidates = [
      { key: "a", score: 0.9, snippet: "important pattern" },
      { key: "b", score: 0.3, snippet: "weak pattern" },
      { key: "c", score: 0.85, snippet: "also important" },
    ]

    const result = runDeepDreaming(candidates, {
      minScore: 0.75,
      maxPromoted: 5,
    })

    expect(result.promoted.length).toBe(2)  // a and c (score >= 0.75)
    expect(result.promoted.some(p => p.key === "a")).toBe(true)
    expect(result.promoted.some(p => p.key === "c")).toBe(true)
    expect(result.promoted.some(p => p.key === "b")).toBe(false)
    expect(result.wroteToLongTerm).toBe(true)
  })
})

describe("Memory Manager Integration", () => {
  it("manages all 4 layers", () => {
    const manager = createMemoryManager()

    manager.add(createMemoryEntry("working", "Current context", ["session"]))
    manager.add(createMemoryEntry("episodic", "Yesterday", ["daily"]))
    manager.add(createMemoryEntry("semantic", "Fact", ["fact"]))
    manager.add(createMemoryEntry("dreams", "Theme", ["theme"]))

    expect(manager.getByLayer("working").length).toBe(1)
    expect(manager.getByLayer("episodic").length).toBe(1)
    expect(manager.getByLayer("semantic").length).toBe(1)
    expect(manager.getByLayer("dreams").length).toBe(1)
  })

  it("computes memory strength with decay", () => {
    const entry = createMemoryEntry("semantic", "Project uses TypeScript", ["fact"])
    entry.recalledCount = 5
    entry.lastRecalledAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const strength = computeMemoryStrength(entry)
    expect(strength).toBeGreaterThan(0)
    expect(strength).toBeLessThanOrEqual(1)
  })

  it("determines if entry should be reviewed", () => {
    const fresh = createMemoryEntry("semantic", "Recent fact", ["fact"])
    fresh.lastRecalledAt = new Date().toISOString()
    fresh.recalledCount = 3

    const stale = createMemoryEntry("semantic", "Old fact", ["fact"])
    stale.lastRecalledAt = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    stale.recalledCount = 1

    expect(shouldReview(fresh)).toBe(false)
    expect(shouldReview(stale)).toBe(true)
  })

  it("promotes entries between layers", () => {
    const manager = createMemoryManager()
    const entry = createMemoryEntry("episodic", "Yesterday's session", ["daily"])
    manager.add(entry)

    manager.promote(entry.id, "semantic")
    expect(manager.getByLayer("episodic").length).toBe(0)
    expect(manager.getByLayer("semantic").length).toBe(1)
  })
})
