import { describe, it, expect } from "bun:test"
import {
  PluginManifest,
  PluginHookName,
  PluginHookRegistration,
  PluginOrigin,
  PluginKind,
  validateManifest,
  PluginRegistry,
  createPluginRegistry,
  definePluginEntry,
  resolveActivationPlan,
  runVoidHook,
  runModifyingHook,
  runClaimingHook,
  PluginActivationTrigger,
  PluginHookRunner,
} from "../../src/plugins/index"

function makeManifest(overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id: "test-plugin",
    name: "Test Plugin",
    version: "1.0.0",
    description: "A test plugin",
    kind: "tool",
    activation: { onStartup: false },
    configSchema: { type: "object", properties: {} },
    hooks: [],
    channels: [],
    providers: [],
    origin: "bundled",
    rootDir: "/tmp/test-plugin",
    ...overrides,
  }
}

describe("Plugin Manifest Validation", () => {
  it("accepts valid manifest", () => {
    const result = validateManifest(makeManifest())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("rejects missing id", () => {
    const result = validateManifest(makeManifest({ id: "" }))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes("id"))).toBe(true)
  })

  it("rejects invalid semver", () => {
    const result = validateManifest(makeManifest({ version: "not-a-version" }))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes("version"))).toBe(true)
  })

  it("accepts valid semver patterns", () => {
    expect(validateManifest(makeManifest({ version: "0.1.0" })).valid).toBe(true)
    expect(validateManifest(makeManifest({ version: "10.20.30" })).valid).toBe(true)
  })

  it("rejects missing description", () => {
    const result = validateManifest(makeManifest({ description: "" }))
    expect(result.valid).toBe(false)
  })

  it("validates activation structure", () => {
    const result = validateManifest(makeManifest({ activation: { onStartup: true } }))
    expect(result.valid).toBe(true)
  })
})

describe("Plugin Registry", () => {
  it("registers and retrieves plugins", () => {
    const registry = createPluginRegistry()
    registry.register(makeManifest())
    expect(registry.get("test-plugin")).toBeDefined()
    expect(registry.get("test-plugin")?.name).toBe("Test Plugin")
  })

  it("lists all registered plugins", () => {
    const registry = createPluginRegistry()
    registry.register(makeManifest({ id: "plugin-a" }))
    registry.register(makeManifest({ id: "plugin-b" }))
    expect(registry.list()).toHaveLength(2)
  })

  it("deduplicates by origin rank (config > bundled)", () => {
    const registry = createPluginRegistry()
    registry.register(makeManifest({ id: "dup", origin: "bundled" }))
    registry.register(makeManifest({ id: "dup", origin: "config" }))
    expect(registry.list()).toHaveLength(1)
    expect(registry.get("dup")?.origin).toBe("config")
  })

  it("enables/disables plugins", () => {
    const registry = createPluginRegistry()
    registry.register(makeManifest())
    registry.disable("test-plugin")
    expect(registry.isEnabled("test-plugin")).toBe(false)
    registry.enable("test-plugin")
    expect(registry.isEnabled("test-plugin")).toBe(true)
  })

  it("removes plugins", () => {
    const registry = createPluginRegistry()
    registry.register(makeManifest())
    registry.remove("test-plugin")
    expect(registry.get("test-plugin")).toBeUndefined()
  })
})

describe("definePluginEntry", () => {
  it("creates a valid plugin definition", () => {
    const entry = definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Does stuff",
      register: () => {},
    })
    expect(entry.id).toBe("my-plugin")
    expect(entry.name).toBe("My Plugin")
    expect(typeof entry.register).toBe("function")
  })

  it("includes configSchema when provided", () => {
    const schema = { type: "object" as const, properties: { key: { type: "string" } } }
    const entry = definePluginEntry({
      id: "my-plugin",
      name: "My Plugin",
      description: "Does stuff",
      configSchema: schema,
      register: () => {},
    })
    expect(entry.configSchema).toBeDefined()
  })
})

describe("Activation Plan Resolution", () => {
  it("resolves plugins activated by command trigger", () => {
    const registry = createPluginRegistry()
    registry.register(makeManifest({
      id: "cmd-plugin",
      activation: { onStartup: false, onCommands: ["deploy"] },
    }))
    registry.register(makeManifest({
      id: "other-plugin",
      activation: { onStartup: false, onCommands: ["test"] },
    }))

    const plan = resolveActivationPlan(registry, {
      kind: "command",
      command: "deploy",
    })
    expect(plan.pluginIds).toContain("cmd-plugin")
    expect(plan.pluginIds).not.toContain("other-plugin")
  })

  it("resolves plugins activated by startup trigger", () => {
    const registry = createPluginRegistry()
    registry.register(makeManifest({
      id: "startup-plugin",
      activation: { onStartup: true },
    }))
    registry.register(makeManifest({
      id: "lazy-plugin",
      activation: { onStartup: false },
    }))

    const plan = resolveActivationPlan(registry, { kind: "startup" })
    expect(plan.pluginIds).toContain("startup-plugin")
    expect(plan.pluginIds).not.toContain("lazy-plugin")
  })

  it("returns empty plan for no matches", () => {
    const registry = createPluginRegistry()
    registry.register(makeManifest({
      id: "plugin",
      activation: { onStartup: false, onCommands: ["other"] },
    }))
    const plan = resolveActivationPlan(registry, { kind: "command", command: "deploy" })
    expect(plan.pluginIds).toHaveLength(0)
  })
})

describe("Hook Runner", () => {
  it("runs void hooks in parallel", async () => {
    const order: number[] = []
    const runner: PluginHookRunner = {
      async runVoid(hookName, handlers) {
        await Promise.all(handlers.map(async (h, i) => {
          await h({} as never)
          order.push(i)
        }))
      },
      async runModifying(hookName, handlers, initial) {
        let result = initial
        for (const h of handlers) {
          result = await h(result, {} as never) ?? result
        }
        return result
      },
      async runClaiming(hookName, handlers) {
        for (const h of handlers) {
          const result = await h({} as never)
          if (result && typeof result === "object" && "handled" in result && result.handled) {
            return result
          }
        }
        return undefined
      },
    }

    await runner.runVoid("before_tool_call", [
      async () => { await new Promise(r => setTimeout(r, 10)); order.push(1) },
      async () => { order.push(2) },
    ])
    expect(order).toContain(1)
    expect(order).toContain(2)
  })

  it("runs modifying hooks sequentially and merges results", async () => {
    const runner: PluginHookRunner = {
      async runVoid() {},
      async runModifying(hookName, handlers, initial) {
        let result = initial
        for (const h of handlers) {
          result = await h(result, {} as never) ?? result
        }
        return result
      },
      async runClaiming() { return undefined },
    }

    const result = await runner.runModifying("before_prompt_build", [
      async (event) => ({ ...event, extra: "added" }),
      async (event) => ({ ...event, count: 1 }),
    ], {} as never)

    expect(result).toEqual({ extra: "added", count: 1 })
  })

  it("stops at first claiming handler that handles", async () => {
    const runner: PluginHookRunner = {
      async runVoid() {},
      async runModifying() { return {} as never },
      async runClaiming(hookName, handlers) {
        for (const h of handlers) {
          const result = await h({} as never)
          if (result && typeof result === "object" && "handled" in result && result.handled) {
            return result
          }
        }
        return undefined
      },
    }

    let callCount = 0
    const result = await runner.runClaiming("before_tool_call", [
      async () => { callCount++; return { handled: true, reason: "blocked" } },
      async () => { callCount++; return { handled: false } },
    ])

    expect(callCount).toBe(1)
    expect(result?.handled).toBe(true)
  })

  it("returns undefined when no claiming handler handles", async () => {
    const runner: PluginHookRunner = {
      async runVoid() {},
      async runModifying() { return {} as never },
      async runClaiming(hookName, handlers) {
        for (const h of handlers) {
          const result = await h({} as never)
          if (result && typeof result === "object" && "handled" in result && result.handled) {
            return result
          }
        }
        return undefined
      },
    }

    const result = await runner.runClaiming("before_tool_call", [
      async () => ({ handled: false }),
      async () => ({ handled: false }),
    ])

    expect(result).toBeUndefined()
  })
})
