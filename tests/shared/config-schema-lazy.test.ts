import { describe, expect, it } from "bun:test"
import { generateJsonSchema, resetSchemaCache } from "../../src/shared/config-schema"

describe("Lazy schema creation", () => {
  it("caches schema after first call", () => {
    resetSchemaCache()
    const first = generateJsonSchema()
    const second = generateJsonSchema()
    expect(first).toBe(second)
  })

  it("returns same reference on repeated calls", () => {
    resetSchemaCache()
    const schema1 = generateJsonSchema()
    const schema2 = generateJsonSchema()
    const schema3 = generateJsonSchema()
    expect(schema1).toBe(schema2)
    expect(schema2).toBe(schema3)
  })

  it("resetSchemaCache forces new creation", () => {
    const first = generateJsonSchema()
    resetSchemaCache()
    const second = generateJsonSchema()
    expect(first).not.toBe(second)
    expect(first).toEqual(second)
  })

  it("schema is valid JSON schema", () => {
    resetSchemaCache()
    const schema = generateJsonSchema()
    expect(schema.type).toBe("object")
    expect(schema.properties).toBeDefined()
    expect(schema.required).toContain("version")
    expect(schema.additionalProperties).toBe(false)
  })
})
