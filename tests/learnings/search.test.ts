import { describe, it, expect } from "bun:test"
import {
  MemorySearchEngine,
  createMemorySearchEngine,
  SearchResult,
  SearchOptions,
} from "../../src/learnings/search"

describe("Memory Search Engine", () => {
  it("creates search engine with empty index", () => {
    const engine = createMemorySearchEngine()
    expect(engine).toBeDefined()
    expect(engine.getIndexSize()).toBe(0)
  })

  it("indexes memory entries", () => {
    const engine = createMemorySearchEngine()
    engine.index([
      { id: "1", content: "TypeScript strict mode prevents errors", tags: ["typescript", "quality"] },
      { id: "2", content: "TDD prevents regressions", tags: ["tdd", "quality"] },
    ])
    expect(engine.getIndexSize()).toBe(2)
  })

  it("searches by keyword", () => {
    const engine = createMemorySearchEngine()
    engine.index([
      { id: "1", content: "TypeScript strict mode prevents errors", tags: ["typescript"] },
      { id: "2", content: "TDD prevents regressions", tags: ["tdd"] },
      { id: "3", content: "Bun is fast for testing", tags: ["bun"] },
    ])

    const results = engine.search("TypeScript")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe("1")
  })

  it("searches by tag", () => {
    const engine = createMemorySearchEngine()
    engine.index([
      { id: "1", content: "TypeScript strict mode", tags: ["typescript", "quality"] },
      { id: "2", content: "TDD prevents regressions", tags: ["tdd", "quality"] },
    ])

    const results = engine.search("quality", { useTags: true })
    expect(results.length).toBe(2)
  })

  it("ranks results by relevance", () => {
    const engine = createMemorySearchEngine()
    engine.index([
      { id: "1", content: "TypeScript is great", tags: [] },
      { id: "2", content: "TypeScript strict mode prevents TypeScript errors", tags: [] },
    ])

    const results = engine.search("TypeScript")
    expect(results.length).toBe(2)
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score)
  })

  it("limits results", () => {
    const engine = createMemorySearchEngine()
    engine.index(
      Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        content: `Memory entry ${i} about TypeScript`,
        tags: [],
      }))
    )

    const results = engine.search("TypeScript", { limit: 5 })
    expect(results.length).toBe(5)
  })

  it("returns empty for no matches", () => {
    const engine = createMemorySearchEngine()
    engine.index([
      { id: "1", content: "TypeScript", tags: [] },
    ])

    const results = engine.search("Python")
    expect(results).toHaveLength(0)
  })

  it("handles case-insensitive search", () => {
    const engine = createMemorySearchEngine()
    engine.index([
      { id: "1", content: "TypeScript strict mode", tags: [] },
    ])

    const results = engine.search("typescript")
    expect(results.length).toBe(1)
  })

  it("handles multi-word search", () => {
    const engine = createMemorySearchEngine()
    engine.index([
      { id: "1", content: "TypeScript strict mode prevents errors", tags: [] },
      { id: "2", content: "TypeScript is a language", tags: [] },
    ])

    const results = engine.search("strict mode")
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe("1")
  })

  it("removes duplicates from results", () => {
    const engine = createMemorySearchEngine()
    engine.index([
      { id: "1", content: "TypeScript strict mode", tags: ["typescript"] },
      { id: "1", content: "TypeScript strict mode", tags: ["typescript"] },
    ])

    const results = engine.search("TypeScript")
    expect(results.length).toBe(1)
  })
})
