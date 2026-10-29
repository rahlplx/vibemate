import { createMemoryManager, createMemoryEntry, runLightDreaming, calculatePromotionScore, ShortTermRecallEntry } from "../src/learnings/dreaming"

console.log("Benchmarking dreaming.ts...")

// Benchmark MemoryManager.getByLayer
const manager = createMemoryManager()
const layers = ["working", "episodic", "semantic", "dreams"] as const
for (let i = 0; i < 4000; i++) {
  manager.add(createMemoryEntry(layers[i % 4], `Content ${i}`, [`tag${i % 10}`]))
}

const start1 = performance.now()
for (let i = 0; i < 10000; i++) {
  manager.getByLayer("semantic")
}
const end1 = performance.now()
console.log(`MemoryManager.getByLayer 10k calls: ${(end1 - start1).toFixed(2)} ms`)

// Benchmark runLightDreaming sort
const entries: ShortTermRecallEntry[] = []
for (let i = 0; i < 1000; i++) {
  const d = new Date(1700000000000 + i * 100000).toISOString()
  entries.push({
    key: `k${i}`,
    path: `f${i}.ts`,
    startLine: 1,
    endLine: 10,
    source: "memory",
    snippet: "snip",
    recallCount: i % 10,
    dailyCount: 1,
    groundedCount: 0,
    totalScore: 1,
    maxScore: 1,
    firstRecalledAt: d,
    lastRecalledAt: d,
    queryHashes: ["q1"],
    recallDays: ["2026-06-25", "2026-06-26", "2026-06-27"],
    conceptTags: ["tag1"],
  })
}

const start2 = performance.now()
for (let i = 0; i < 2000; i++) {
  runLightDreaming(entries, { limit: 20, dedupeSimilarity: 0.85 })
}
const end2 = performance.now()
console.log(`runLightDreaming 2k calls: ${(end2 - start2).toFixed(2)} ms`)

// Benchmark calculatePromotionScore
const entry = entries[0]
const nowMs = Date.parse("2026-06-27T12:00:00Z")
const start3 = performance.now()
for (let i = 0; i < 50000; i++) {
  calculatePromotionScore(entry, { nowMs, halfLifeDays: 30 })
}
const end3 = performance.now()
console.log(`calculatePromotionScore 50k calls: ${(end3 - start3).toFixed(2)} ms`)
