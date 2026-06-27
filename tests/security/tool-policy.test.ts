import { describe, it, expect } from "bun:test"
import {
  ToolPolicy,
  ToolPolicyStep,
  buildToolPolicyPipeline,
  applyToolPolicyPipeline,
  ToolPolicyResult,
  matchToolPolicy,
  expandToolGroups,
  ToolProfileId,
  DEFAULT_TOOL_PROFILES,
} from "../../src/security/tool-policy"

const ALL_CORE_TOOLS = [
  "read", "write", "edit", "exec", "process",
  "image", "sessions_list", "sessions_history",
  "sessions_send", "sessions_spawn", "sessions_yield",
  "subagents", "session_status",
]

const PLUGIN_TOOLS = ["my-plugin-tool-a", "my-plugin-tool-b"]

describe("Tool Policy Pipeline", () => {
  it("builds 8-layer pipeline with defaults", () => {
    const pipeline = buildToolPolicyPipeline({})
    expect(pipeline.steps).toHaveLength(8)
    expect(pipeline.steps[0].label).toContain("profile")
    expect(pipeline.steps[7].label).toContain("toolsBySender")
  })

  it("applies profile as base layer", () => {
    const pipeline = buildToolPolicyPipeline({
      profile: { allow: ["read", "write"] },
    })
    const result = applyToolPolicyPipeline(pipeline, ALL_CORE_TOOLS)
    expect(result.allowed).toContain("read")
    expect(result.allowed).toContain("write")
    expect(result.allowed).not.toContain("exec")
  })

  it("deny always wins over allow", () => {
    const pipeline = buildToolPolicyPipeline({
      profile: { allow: ["*"] },
      globalPolicy: { deny: ["exec"] },
    })
    const result = applyToolPolicyPipeline(pipeline, ALL_CORE_TOOLS)
    expect(result.allowed).not.toContain("exec")
    expect(result.allowed).toContain("read")
  })

  it("empty allow means allow all", () => {
    const pipeline = buildToolPolicyPipeline({
      globalPolicy: { deny: ["exec"] },
    })
    const result = applyToolPolicyPipeline(pipeline, ALL_CORE_TOOLS)
    expect(result.allowed).not.toContain("exec")
    expect(result.allowed).toContain("read")
    expect(result.allowed).toContain("write")
  })

  it("layers narrow sequentially (cannot widen)", () => {
    const pipeline = buildToolPolicyPipeline({
      profile: { allow: ["read", "write", "exec"] },
      globalPolicy: { allow: ["read", "exec"] },  // Narrows: removes "write"
      agentPolicy: { allow: ["read"] },             // Narrows: removes "exec"
    })
    const result = applyToolPolicyPipeline(pipeline, ALL_CORE_TOOLS)
    expect(result.allowed).toEqual(["read"])
  })

  it("agent-level deny overrides global allow", () => {
    const pipeline = buildToolPolicyPipeline({
      globalPolicy: { allow: ["read", "write", "exec"] },
      agentPolicy: { deny: ["exec"] },
    })
    const result = applyToolPolicyPipeline(pipeline, ALL_CORE_TOOLS)
    expect(result.allowed).toContain("read")
    expect(result.allowed).not.toContain("exec")
  })

  it("tracks policy provenance at each layer", () => {
    const pipeline = buildToolPolicyPipeline({
      profile: { allow: ["read"] },
      globalPolicy: { deny: ["write"] },
    })
    const result = applyToolPolicyPipeline(pipeline, ALL_CORE_TOOLS)
    expect(result.layers.length).toBeGreaterThan(0)
    expect(result.layers[0].label).toContain("profile")
  })

  it("returns audit trail", () => {
    const pipeline = buildToolPolicyPipeline({
      profile: { allow: ["read", "write"] },
    })
    const result = applyToolPolicyPipeline(pipeline, ALL_CORE_TOOLS)
    expect(result.audit).toBeDefined()
    expect(result.audit.length).toBeGreaterThan(0)
  })
})

describe("Tool Profile Matching", () => {
  it("minimal profile restricts to core read/write", () => {
    const profile = DEFAULT_TOOL_PROFILES.minimal
    expect(profile.allow).toContain("read")
    expect(profile.allow).toContain("write")
    expect(profile.allow).not.toContain("exec")
  })

  it("coding profile allows exec", () => {
    const profile = DEFAULT_TOOL_PROFILES.coding
    expect(profile.allow).toContain("exec")
    expect(profile.allow).toContain("read")
    expect(profile.allow).toContain("write")
  })

  it("full profile allows everything", () => {
    const profile = DEFAULT_TOOL_PROFILES.full
    expect(profile.allow).toContain("*")
  })
})

describe("Glob Pattern Matching", () => {
  it("matches exact tool names", () => {
    expect(matchToolPolicy("read", { allow: ["read"] })).toBe(true)
    expect(matchToolPolicy("exec", { allow: ["read"] })).toBe(false)
  })

  it("matches wildcard patterns", () => {
    expect(matchToolPolicy("sessions_list", { allow: ["sessions_*"] })).toBe(true)
    expect(matchToolPolicy("sessions_send", { allow: ["sessions_*"] })).toBe(true)
    expect(matchToolPolicy("read", { allow: ["sessions_*"] })).toBe(false)
  })

  it("matches star-all pattern", () => {
    expect(matchToolPolicy("anything", { allow: ["*"] })).toBe(true)
  })

  it("deny wins over allow with same pattern", () => {
    expect(matchToolPolicy("read", { allow: ["*"], deny: ["read"] })).toBe(false)
  })

  it("handles multiple allow patterns", () => {
    expect(matchToolPolicy("read", { allow: ["write", "read"] })).toBe(true)
    expect(matchToolPolicy("exec", { allow: ["write", "read"] })).toBe(false)
  })

  it("handles multiple deny patterns", () => {
    expect(matchToolPolicy("exec", { deny: ["exec", "process"] })).toBe(false)
    expect(matchToolPolicy("read", { deny: ["exec", "process"] })).toBe(true)
  })
})

describe("Tool Group Expansion", () => {
  it("expands named groups to concrete tools", () => {
    const expanded = expandToolGroups(["fs"])
    expect(expanded).toContain("read")
    expect(expanded).toContain("write")
    expect(expanded).toContain("edit")
  })

  it("expands sessions group", () => {
    const expanded = expandToolGroups(["sessions"])
    expect(expanded).toContain("sessions_list")
    expect(expanded).toContain("sessions_history")
    expect(expanded).toContain("sessions_send")
  })

  it("passes through unknown groups as-is", () => {
    const expanded = expandToolGroups(["unknown_group"])
    expect(expanded).toContain("unknown_group")
  })

  it("deduplicates expanded tools", () => {
    const expanded = expandToolGroups(["fs", "read"])
    const unique = [...new Set(expanded)]
    expect(expanded.length).toBe(unique.length)
  })
})

describe("Tool Policy Pipeline Audit", () => {
  it("records which tools were filtered at each step", () => {
    const pipeline = buildToolPolicyPipeline({
      profile: { allow: ["read", "write", "exec"] },
      agentPolicy: { deny: ["exec"] },
    })
    const result = applyToolPolicyPipeline(pipeline, ALL_CORE_TOOLS)
    const agentDenyStep = result.audit.find(a => a.label.includes("agent") && a.action === "deny")
    expect(agentDenyStep).toBeDefined()
    expect(agentDenyStep?.tools).toContain("exec")
  })

  it("records allowed tools at each step", () => {
    const pipeline = buildToolPolicyPipeline({
      profile: { allow: ["read", "write"] },
    })
    const result = applyToolPolicyPipeline(pipeline, ALL_CORE_TOOLS)
    expect(result.audit.some(a => a.action === "allow" && a.tools.length > 0)).toBe(true)
  })
})
