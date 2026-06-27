import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs"
import { join } from "path"
import { extractData } from "../../src/learnings/extract"

const TEST_DIR = join(import.meta.dir, ".test-repo-extract")

beforeEach(() => {
  if (!existsSync(TEST_DIR)) mkdirSync(TEST_DIR, { recursive: true })

  writeFileSync(join(TEST_DIR, "index.ts"), `
export function hello() { return "world" }
export const config = { debug: true }
export class UserService {
  private static instance: UserService
  static getInstance() { return this.instance }
}
`)
  writeFileSync(join(TEST_DIR, "utils.ts"), `
export function formatDate(d: Date) { return d.toISOString() }
export function parseJSON(s: string) { return JSON.parse(s) }
`)
  writeFileSync(join(TEST_DIR, "index.test.ts"), `
import { describe, it, expect } from "bun:test"
describe("hello", () => {
  it("returns world", () => { expect(hello()).toBe("world") })
})
`)
  writeFileSync(join(TEST_DIR, "package.json"), JSON.stringify({
    name: "test-repo",
    dependencies: { lodash: "^4.17.0", zod: "^3.22.0" },
    devDependencies: { vitest: "^1.0.0" },
    scripts: { test: "bun test", build: "bun build" },
  }))
  writeFileSync(join(TEST_DIR, "tsconfig.json"), JSON.stringify({
    compilerOptions: { strict: true },
  }))
  writeFileSync(join(TEST_DIR, ".eslintrc.json"), JSON.stringify({ extends: "eslint:recommended" }))
})

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
})

describe("extractData", () => {
  it("returns full ExtractedData structure", () => {
    const data = extractData(TEST_DIR)
    expect(data).toHaveProperty("architecture")
    expect(data).toHaveProperty("patterns")
    expect(data).toHaveProperty("quality")
    expect(data).toHaveProperty("dependencies")
  })

  it("detects entry points", () => {
    const data = extractData(TEST_DIR)
    expect(data.architecture.entryPoints.length).toBeGreaterThan(0)
  })

  it("detects design patterns (Singleton)", () => {
    const data = extractData(TEST_DIR)
    const singletons = data.patterns.designPatterns.filter(p => p.name === "Singleton")
    expect(singletons.length).toBeGreaterThan(0)
  })

  it("detects coding style", () => {
    const data = extractData(TEST_DIR)
    expect(data.patterns.codingStyle).toHaveProperty("indentStyle")
    expect(data.patterns.codingStyle).toHaveProperty("quoteStyle")
  })

  it("detects conventions (eslint, typescript-strict)", () => {
    const data = extractData(TEST_DIR)
    expect(data.patterns.conventions).toContain("eslint")
    expect(data.patterns.conventions).toContain("typescript-strict")
  })

  it("detects typed error handling", () => {
    const data = extractData(TEST_DIR)
    expect(["typed", "generic", "mixed"]).toContain(data.quality.errorHandling)
  })

  it("counts dependencies", () => {
    const data = extractData(TEST_DIR)
    expect(data.dependencies.direct.length).toBe(2)
    expect(data.dependencies.dev.length).toBe(1)
  })

  it("detects unused dependencies", () => {
    const data = extractData(TEST_DIR)
    expect(data.dependencies.unused).toContain("lodash")
  })
})
