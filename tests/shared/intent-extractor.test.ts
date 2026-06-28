import { describe, expect, it } from "bun:test"
import { IntentSchema, createMockIntentExtractor, createIntentExtractor, type Intent } from "../../src/shared/intent-extractor"

describe("Intent Extractor", () => {
  it("validates intent schema", () => {
    const intent: Intent = {
      action: "create",
      target: "auth module",
      confidence: 0.95,
      reasoning: "User wants to build authentication",
      context: { urgency: "medium", scope: "module", complexity: "complex" },
    }
    const result = IntentSchema.safeParse(intent)
    expect(result.success).toBe(true)
  })

  it("rejects invalid action", () => {
    const intent = {
      action: "invalid",
      target: "test",
      confidence: 0.5,
      reasoning: "test",
      context: { urgency: "low", scope: "file", complexity: "simple" },
    }
    const result = IntentSchema.safeParse(intent)
    expect(result.success).toBe(false)
  })

  it("rejects invalid urgency", () => {
    const intent = {
      action: "fix",
      target: "test",
      confidence: 0.5,
      reasoning: "test",
      context: { urgency: "invalid", scope: "file", complexity: "simple" },
    }
    const result = IntentSchema.safeParse(intent)
    expect(result.success).toBe(false)
  })

  it("allows optional subIntents", () => {
    const intent: Intent = {
      action: "refactor",
      target: "database layer",
      confidence: 0.8,
      reasoning: "Complex refactoring needed",
      subIntents: [
        { action: "modify", target: "schema" },
        { action: "test", target: "migrations" },
      ],
      context: { urgency: "high", scope: "module", complexity: "complex" },
    }
    const result = IntentSchema.safeParse(intent)
    expect(result.success).toBe(true)
    expect(result.data?.subIntents).toHaveLength(2)
  })

  it("mock extractor returns default intent", async () => {
    const extractor = createMockIntentExtractor()
    const intent = await extractor.extract("add login page")
    expect(intent.action).toBe("create")
    expect(intent.confidence).toBeGreaterThan(0)
  })

  it("mock extractor cycles through responses", async () => {
    const responses: Intent[] = [
      { action: "create", target: "a", confidence: 0.9, reasoning: "r", context: { urgency: "low", scope: "file", complexity: "simple" } },
      { action: "fix", target: "b", confidence: 0.8, reasoning: "r", context: { urgency: "high", scope: "module", complexity: "moderate" } },
    ]
    const extractor = createMockIntentExtractor(responses)
    const first = await extractor.extract("first")
    const second = await extractor.extract("second")
    expect(first.action).toBe("create")
    expect(second.action).toBe("fix")
  })

  it("mock extractor wraps around", async () => {
    const responses: Intent[] = [
      { action: "create", target: "a", confidence: 0.9, reasoning: "r", context: { urgency: "low", scope: "file", complexity: "simple" } },
    ]
    const extractor = createMockIntentExtractor(responses)
    await extractor.extract("first")
    const second = await extractor.extract("second")
    expect(second.action).toBe("create")
  })
})

describe("createIntentExtractor factory", () => {
  it("createIntentExtractor returns an IntentExtractor with an extract method", () => {
    // Cover lines 38-40 (function entry + Anthropic client creation)
    // Without calling extract, we don't need a real API key to just create the instance
    const extractor = createIntentExtractor('fake-key-for-test')
    expect(typeof extractor.extract).toBe('function')
  })
})
