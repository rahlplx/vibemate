import { describe, it, expect } from "bun:test"
import { RepoConfigSchema } from "../../src/learnings/types"

describe("learnings types", () => {
  it("validates RepoConfig with valid URL", () => {
    const result = RepoConfigSchema.safeParse({
      url: "https://github.com/user/repo.git",
    })
    expect(result.success).toBe(true)
  })

  it("rejects RepoConfig with invalid URL", () => {
    const result = RepoConfigSchema.safeParse({
      url: "not-a-url",
    })
    expect(result.success).toBe(false)
  })

  it("defaults depth to 1", () => {
    const result = RepoConfigSchema.parse({ url: "https://github.com/user/repo.git" })
    expect(result.depth).toBe(1)
  })

  it("accepts optional branch", () => {
    const result = RepoConfigSchema.parse({
      url: "https://github.com/user/repo.git",
      branch: "main",
    })
    expect(result.branch).toBe("main")
  })

  it("accepts custom timeout", () => {
    const result = RepoConfigSchema.parse({
      url: "https://github.com/user/repo.git",
      timeout: 600000,
    })
    expect(result.timeout).toBe(600000)
  })
})
