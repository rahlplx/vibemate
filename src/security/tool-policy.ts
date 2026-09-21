export type ToolProfileId = "minimal" | "coding" | "messaging" | "full"

export interface ToolPolicy {
  allow?: string[]
  deny?: string[]
}

export interface ToolProfilePolicy {
  allow: string[]
}

export const DEFAULT_TOOL_PROFILES: Record<ToolProfileId, ToolProfilePolicy> = {
  minimal: { allow: ["read", "write", "edit"] },
  coding: { allow: ["read", "write", "edit", "exec", "process", "image"] },
  messaging: { allow: ["read", "write", "sessions_list", "sessions_history", "sessions_send"] },
  full: { allow: ["*"] },
}

export interface ToolPolicyStep {
  policy: ToolPolicy | undefined
  label: string
}

export interface ToolPolicyPipeline {
  steps: ToolPolicyStep[]
}

export interface ToolPolicyAuditEntry {
  label: string
  action: "allow" | "deny"
  tools: string[]
}

export interface ToolPolicyResult {
  allowed: string[]
  denied: string[]
  layers: Array<{ label: string; before: string[]; after: string[] }>
  audit: ToolPolicyAuditEntry[]
}

const TOOL_GROUPS: Record<string, string[]> = {
  fs: ["read", "write", "edit"],
  sessions: ["sessions_list", "sessions_history", "sessions_send", "sessions_spawn", "sessions_yield"],
  agents: ["subagents", "session_status"],
  all: ["*"],
}

export function expandToolGroups(list?: string[]): string[] {
  if (!list || list.length === 0) return []
  const expanded: string[] = []
  for (const value of list) {
    const group = TOOL_GROUPS[value]
    if (group) {
      expanded.push(...group)
    } else {
      expanded.push(value)
    }
  }
  return [...new Set(expanded)]
}

type CompiledPattern =
  | { kind: "all" }
  | { kind: "exact"; value: string }
  | { kind: "glob"; regex: RegExp }

function compilePattern(raw: string): CompiledPattern {
  const normalized = raw.toLowerCase()
  if (normalized === "*") return { kind: "all" }
  if (!normalized.includes("*")) return { kind: "exact", value: normalized }
  const regex = new RegExp(`^${normalized.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`)
  return { kind: "glob", regex }
}

function matchesPattern(name: string, patterns: CompiledPattern[]): boolean {
  const normalized = name.toLowerCase()
  for (const p of patterns) {
    if (p.kind === "all") return true
    if (p.kind === "exact" && normalized === p.value) return true
    if (p.kind === "glob" && p.regex.test(normalized)) return true
  }
  return false
}

function matchCompiledPolicy(
  name: string,
  denyPatterns: CompiledPattern[],
  allowPatterns: CompiledPattern[],
): boolean {
  if (denyPatterns.length > 0 && matchesPattern(name, denyPatterns)) return false
  if (allowPatterns.length === 0) return true
  return matchesPattern(name, allowPatterns)
}

export function matchToolPolicy(name: string, policy: ToolPolicy): boolean {
  const denyPatterns = (policy.deny ?? []).map(compilePattern)
  const allowPatterns = (policy.allow ?? []).map(compilePattern)
  return matchCompiledPolicy(name, denyPatterns, allowPatterns)
}

function filterToolsByPolicy(tools: string[], policy: ToolPolicy): string[] {
  return tools.filter(t => matchToolPolicy(t, policy))
}

export function buildToolPolicyPipeline(params: {
  profile?: ToolPolicy
  providerProfile?: ToolPolicy
  globalPolicy?: ToolPolicy
  globalProviderPolicy?: ToolPolicy
  agentPolicy?: ToolPolicy
  agentProviderPolicy?: ToolPolicy
  groupPolicy?: ToolPolicy
  senderPolicy?: ToolPolicy
}): ToolPolicyPipeline {
  return {
    steps: [
      { policy: params.profile, label: "tools.profile" },
      { policy: params.providerProfile, label: "tools.byProvider.profile" },
      { policy: params.globalPolicy, label: "tools.allow" },
      { policy: params.globalProviderPolicy, label: "tools.byProvider.allow" },
      { policy: params.agentPolicy, label: "agent tools.allow" },
      { policy: params.agentProviderPolicy, label: "agent tools.byProvider.allow" },
      { policy: params.groupPolicy, label: "group tools.allow" },
      { policy: params.senderPolicy, label: "tools.toolsBySender" },
    ],
  }
}

export function applyToolPolicyPipeline(
  pipeline: ToolPolicyPipeline,
  availableTools: string[],
): ToolPolicyResult {
  // Pre-compile steps to avoid re-compiling regex patterns per tool on each step
  const compiledSteps: Array<{
    label: string
    deny: CompiledPattern[]
    allow: CompiledPattern[]
  }> = []

  for (let i = 0; i < pipeline.steps.length; i++) {
    const step = pipeline.steps[i]
    if (!step.policy) continue
    compiledSteps.push({
      label: step.label,
      deny: (step.policy.deny ?? []).map(compilePattern),
      allow: (step.policy.allow ?? []).map(compilePattern),
    })
  }

  let filtered = [...availableTools]
  const layers: ToolPolicyResult["layers"] = []
  const audit: ToolPolicyAuditEntry[] = []

  for (let i = 0; i < compiledSteps.length; i++) {
    const step = compiledSteps[i]
    const before = filtered
    const nextFiltered: string[] = []
    const deniedTools: string[] = []

    // Single-pass partitioning of tools for current pipeline layer
    for (let j = 0; j < before.length; j++) {
      const tool = before[j]
      if (matchCompiledPolicy(tool, step.deny, step.allow)) {
        nextFiltered.push(tool)
      } else {
        deniedTools.push(tool)
      }
    }

    filtered = nextFiltered
    layers.push({ label: step.label, before, after: filtered })

    if (deniedTools.length > 0) {
      audit.push({ label: step.label, action: "deny", tools: deniedTools })
    }
    if (filtered.length > 0) {
      audit.push({ label: step.label, action: "allow", tools: filtered })
    }
  }

  // O(1) set lookup to determine overall denied tools
  const filteredSet = new Set(filtered)
  const denied = availableTools.filter(t => !filteredSet.has(t))

  return { allowed: filtered, denied, layers, audit }
}
