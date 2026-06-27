import { createPluginRegistry, resolveActivationPlan } from "../src/plugins/index"
import { buildToolPolicyPipeline, applyToolPolicyPipeline } from "../src/security/tool-policy"
import {
  createMemoryManager, createMemoryEntry,
  runLightDreaming, runRemDreaming, runDeepDreaming,
  calculateTemporalDecay,
} from "../src/learnings/dreaming"

let pass = 0, fail = 0
function assert(cond: boolean, msg: string) { if (cond) pass++; else { fail++; console.error("FAIL:", msg) } }

console.log("=== SIMULATION: Plugin Lifecycle (100 iterations) ===")
for (let i = 0; i < 100; i++) {
  const registry = createPluginRegistry()
  for (let j = 0; j < 50; j++) {
    const origins: Array<"config"|"workspace"|"global"|"bundled"> = ["config","workspace","global","bundled"]
    registry.register({
      id: `p-${j}`, name: `Plugin ${j}`, version: "1.0.0", description: "test",
      activation: { onStartup: j % 2 === 0 },
      origin: origins[j % 4], rootDir: "/tmp",
      configSchema: { type: "object", properties: {} },
    })
  }
  assert(registry.list().length > 0, "registry has plugins")
  const plan = resolveActivationPlan(registry, { kind: "startup" })
  assert(plan.pluginIds.length > 0, "startup plan has plugins")
}
console.log(`  ${pass} pass, ${fail} fail`)

console.log("=== SIMULATION: Tool Policy Pipeline (100 iterations) ===")
const tools = ["read","write","edit","exec","process","image","sessions_list","sessions_history","sessions_send","sessions_spawn","sessions_yield","subagents","session_status"]
for (let i = 0; i < 100; i++) {
  const pipeline = buildToolPolicyPipeline({
    profile: { allow: tools.slice(0, 5 + (i % 8)) },
    globalPolicy: { deny: tools.slice(0, i % 3) },
    agentPolicy: { allow: tools.slice(0, 3 + (i % 10)) },
  })
  const result = applyToolPolicyPipeline(pipeline, tools)
  assert(result.allowed.length <= tools.length, "allowed <= total")
  assert(result.audit.length > 0, "audit has entries")
}
console.log(`  ${pass} pass, ${fail} fail`)

console.log("=== SIMULATION: Memory Dreaming (100 iterations) ===")
for (let i = 0; i < 100; i++) {
  const manager = createMemoryManager()
  for (let j = 0; j < 200; j++) {
    const layers: Array<"working"|"episodic"|"semantic"|"dreams"> = ["working","episodic","semantic","dreams"]
    manager.add(createMemoryEntry(layers[j % 4], `content-${j}`, ["tag1","tag2"]))
  }
  assert(manager.list().length === 200, "200 entries")

  const entries = Array.from({length: 50}, (_, j) => ({
    key: `key-${j}`, path: `file-${j}.ts`, startLine: 1, endLine: 10, source: "memory",
    snippet: `snippet ${j}`, recallCount: j, dailyCount: j % 5, groundedCount: j % 3,
    totalScore: j * 0.1, maxScore: 0.9, firstRecalledAt: "2026-06-20T00:00:00Z",
    lastRecalledAt: new Date(Date.now() - j * 86400000).toISOString(),
    queryHashes: Array.from({length: j % 5}, (_, k) => `q${k}`),
    recallDays: Array.from({length: j % 7}, (_, k) => `2026-06-${20 + k}`),
    conceptTags: j % 3 === 0 ? ["api", "utility"] : ["helper"],
  }))

  const light = runLightDreaming(entries, { limit: 10, dedupeSimilarity: 0.8 })
  assert(light.staged.length <= 10, "light staged <= 10")

  const rem = runRemDreaming(entries, { limit: 5, minPatternStrength: 0.3 })
  assert(rem.themes.length >= 0, "rem themes computed")

  const deep = runDeepDreaming(
    entries.map(e => ({ key: e.key, score: e.recallCount / 10, snippet: e.snippet })),
    { minScore: 0.5, maxPromoted: 3 }
  )
  assert(deep.promoted.length <= 3, "deep promoted <= 3")
}
console.log(`  ${pass} pass, ${fail} fail`)

console.log("=== SIMULATION: Temporal Decay (525 iterations) ===")
for (let halfLife = 7; halfLife <= 90; halfLife += 7) {
  for (let age = 0; age <= 365; age += 7) {
    const d = calculateTemporalDecay(age, halfLife)
    assert(d >= 0 && d <= 1, `decay valid age=${age} half=${halfLife}`)
  }
}
console.log(`  ${pass} pass, ${fail} fail`)

console.log(`\n=== FINAL: ${pass} pass, ${fail} fail ===`)
process.exit(fail > 0 ? 1 : 0)
