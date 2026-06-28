import { LRUCache } from "../performance/cache";

export type PluginOrigin = "config" | "workspace" | "global" | "bundled"
export type PluginKind = "tool" | "hook" | "provider" | "channel" | "command"
export type PluginHookFailurePolicy = "fail-open" | "fail-closed"

export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  kind?: PluginKind
  activation: PluginActivation
  configSchema?: Record<string, unknown>
  hooks?: string[]
  channels?: string[]
  providers?: string[]
  commandAliases?: Array<{ name: string; kind: string }>
  origin: PluginOrigin
  rootDir: string
}

export interface PluginActivation {
  onStartup?: boolean
  onCommands?: string[]
  onProviders?: string[]
  onChannels?: string[]
  onCapabilities?: string[]
}

export type PluginHookName =
  | "before_tool_call"
  | "after_tool_call"
  | "before_prompt_build"
  | "before_agent_reply"
  | "session_start"
  | "session_end"
  | "gateway_start"
  | "gateway_stop"
  | "before_agent_run"

export interface PluginHookRegistration<K extends PluginHookName = PluginHookName> {
  pluginId: string
  hookName: K
  handler: (event: unknown, ctx: unknown) => Promise<unknown> | unknown
  priority?: number
  timeoutMs?: number
}

export interface ManifestValidationResult {
  valid: boolean
  errors: string[]
}

const SEMVER_PATTERN = /^[0-9]+\.[0-9]+\.[0-9]+$/

export function validateManifest(manifest: PluginManifest): ManifestValidationResult {
  const errors: string[] = []
  if (!manifest.id || manifest.id.trim().length === 0) errors.push("id is required")
  if (!manifest.name || manifest.name.trim().length === 0) errors.push("name is required")
  if (!manifest.version || !SEMVER_PATTERN.test(manifest.version)) errors.push("version must be semver (x.y.z)")
  if (!manifest.description || manifest.description.trim().length === 0) errors.push("description is required")
  if (!manifest.activation) errors.push("activation is required")
  return { valid: errors.length === 0, errors }
}

export interface PluginRegistryEntry {
  manifest: PluginManifest
  enabled: boolean
  hooks: PluginHookRegistration[]
}

const ORIGIN_RANK: Record<PluginOrigin, number> = {
  config: 0,
  workspace: 1,
  global: 2,
  bundled: 3,
}

export interface PluginRegistry {
  register(manifest: PluginManifest): void
  get(id: string): PluginManifest | undefined
  list(): PluginManifest[]
  isEnabled(id: string): boolean
  enable(id: string): void
  disable(id: string): void
  remove(id: string): void
  getByOrigin(origin: PluginOrigin): PluginManifest[]
  clearCache(): void
}

// Global cache for activation plans across registry instances
const activationCache = new LRUCache<PluginActivationPlan>({
  maxSize: 100,
  defaultTTL: 300_000 // 5 minutes
});

export function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<string, PluginRegistryEntry>()

  return {
    register(manifest: PluginManifest) {
      const existing = plugins.get(manifest.id)
      if (existing && ORIGIN_RANK[existing.manifest.origin] <= ORIGIN_RANK[manifest.origin]) {
        return
      }
      plugins.set(manifest.id, { manifest, enabled: true, hooks: [] })
      activationCache.clear() // Invalidate cache on new registration
    },

    get(id: string) {
      return plugins.get(id)?.manifest
    },

    list() {
      return [...plugins.values()].map(e => e.manifest)
    },

    isEnabled(id: string) {
      return plugins.get(id)?.enabled ?? false
    },

    enable(id: string) {
      const entry = plugins.get(id)
      if (entry) {
        entry.enabled = true
        activationCache.clear()
      }
    },

    disable(id: string) {
      const entry = plugins.get(id)
      if (entry) {
        entry.enabled = false
        activationCache.clear()
      }
    },

    remove(id: string) {
      plugins.delete(id)
      activationCache.clear()
    },

    getByOrigin(origin: PluginOrigin) {
      return [...plugins.values()]
        .filter(e => e.manifest.origin === origin)
        .map(e => e.manifest)
    },

    clearCache() {
      activationCache.clear()
    }
  }
}

export interface PluginDefinition {
  id: string
  name: string
  description: string
  kind?: PluginKind
  configSchema?: Record<string, unknown>
  register: (api: PluginApi) => void
}

export interface PluginApi {
  registerCommand(cmd: { name: string; description: string; handler: (ctx: unknown) => void }): void
  on(hookName: PluginHookName, handler: (event: unknown, ctx: unknown) => unknown): void
}

export function definePluginEntry(opts: {
  id: string
  name: string
  description: string
  kind?: PluginKind
  configSchema?: Record<string, unknown>
  register: (api: PluginApi) => void
}): PluginDefinition {
  return {
    id: opts.id,
    name: opts.name,
    description: opts.description,
    kind: opts.kind,
    configSchema: opts.configSchema,
    register: opts.register,
  }
}

export type PluginActivationTrigger =
  | { kind: "startup" }
  | { kind: "command"; command: string }
  | { kind: "provider"; provider: string }
  | { kind: "channel"; channel: string }

export interface PluginActivationPlan {
  trigger: PluginActivationTrigger
  pluginIds: string[]
}

export function resolveActivationPlan(
  registry: PluginRegistry,
  trigger: PluginActivationTrigger,
): PluginActivationPlan {
  let cacheKey: string;
  if (trigger.kind === "startup") cacheKey = "startup";
  else if (trigger.kind === "command") cacheKey = `cmd:${trigger.command}`;
  else if (trigger.kind === "provider") cacheKey = `prov:${trigger.provider}`;
  else cacheKey = `chan:${trigger.channel}`;

  const cached = activationCache.get(cacheKey);
  if (cached) return cached;

  const matched: string[] = []
  for (const manifest of registry.list()) {
    if (!registry.isEnabled(manifest.id)) continue
    const activation = manifest.activation
    if (trigger.kind === "startup" && activation.onStartup) {
      matched.push(manifest.id)
    } else if (trigger.kind === "command" && activation.onCommands?.includes(trigger.command)) {
      matched.push(manifest.id)
    } else if (trigger.kind === "provider" && activation.onProviders?.includes(trigger.provider)) {
      matched.push(manifest.id)
    } else if (trigger.kind === "channel" && activation.onChannels?.includes(trigger.channel)) {
      matched.push(manifest.id)
    }
  }

  const plan = { trigger, pluginIds: matched };
  activationCache.set(cacheKey, plan);
  return plan;
}

export type HookDispatchMode = "void" | "modifying" | "claiming"

export interface PluginHookRunner {
  runVoid(
    hookName: PluginHookName,
    handlers: Array<(event: unknown) => Promise<void> | void>,
  ): Promise<void>
  runModifying<T>(
    hookName: PluginHookName,
    handlers: Array<(event: T, ctx: unknown) => Promise<T | void> | T | void>,
    initial: T,
  ): Promise<T>
  runClaiming(
    hookName: PluginHookName,
    handlers: Array<(event: unknown) => Promise<{ handled: boolean; reason?: string } | undefined>>,
  ): Promise<{ handled: boolean; reason?: string } | undefined>
}
