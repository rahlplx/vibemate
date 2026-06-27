import { describe, it, expect } from "bun:test"
import {
  generateJsonSchema,
  ConfigUiHints,
  ConfigFieldHint,
  getFieldHints,
  ConfigBackupManager,
} from "../../src/shared/config-schema"
import { VibemateExtendedConfig } from "../../src/shared/config"

describe("JSON Schema Generation", () => {
  it("generates a valid JSON Schema object", () => {
    const schema = generateJsonSchema()
    expect(schema.type).toBe("object")
    expect(schema.properties).toBeDefined()
  })

  it("includes all top-level config fields", () => {
    const schema = generateJsonSchema()
    const props = schema.properties as Record<string, unknown>
    expect(props.version).toBeDefined()
    expect(props.stateDir).toBeDefined()
    expect(props.databaseFile).toBeDefined()
    expect(props.telemetryEnabled).toBeDefined()
    expect(props.evolutionCadence).toBeDefined()
    expect(props.budget).toBeDefined()
  })

  it("marks required fields", () => {
    const schema = generateJsonSchema()
    expect(schema.required).toContain("version")
    expect(schema.required).toContain("stateDir")
    expect(schema.required).toContain("budget")
  })

  it("includes field descriptions", () => {
    const schema = generateJsonSchema()
    const props = schema.properties as Record<string, Record<string, unknown>>
    expect(props.version.description).toBeDefined()
    expect(props.budget.description).toBeDefined()
  })

  it("constrains budget to non-negative", () => {
    const schema = generateJsonSchema()
    const props = schema.properties as Record<string, Record<string, Record<string, unknown>>>
    expect(props.budget.minimum).toBe(0)
  })

  it("enum for evolutionCadence", () => {
    const schema = generateJsonSchema()
    const props = schema.properties as Record<string, Record<string, unknown>>
    expect(props.evolutionCadence.enum).toEqual(["task", "daily", "weekly"])
  })
})

describe("UI Hints", () => {
  it("has hints for all config fields", () => {
    const hints = getFieldHints()
    expect(hints.version).toBeDefined()
    expect(hints.budget).toBeDefined()
    expect(hints.telemetryEnabled).toBeDefined()
  })

  it("includes labels", () => {
    const hints = getFieldHints()
    expect(hints.version.label).toBeTruthy()
    expect(hints.budget.label).toBeTruthy()
  })

  it("includes descriptions", () => {
    const hints = getFieldHints()
    expect(hints.version.description).toBeTruthy()
    expect(hints.budget.description).toBeTruthy()
  })

  it("specifies groups", () => {
    const hints = getFieldHints()
    expect(hints.version.group).toBeDefined()
    expect(hints.budget.group).toBeDefined()
  })

  it("specifies input types", () => {
    const hints = getFieldHints()
    expect(hints.telemetryEnabled.type).toBe("boolean")
    expect(hints.budget.type).toBe("number")
    expect(hints.version.type).toBe("text")
    expect(hints.evolutionCadence.type).toBe("select")
  })
})

describe("Config Backup Manager", () => {
  it("creates backup with timestamp", () => {
    const mgr = new ConfigBackupManager("/tmp/test-backups")
    const config: VibemateExtendedConfig = {
      version: "1.0.0",
      stateDir: ".vibe",
      databaseFile: "state.db",
      telemetryEnabled: true,
      evolutionCadence: "task",
      maxComplexityForInline: 5,
      maxComplexityForSession: 15,
      budget: 10.0,
      llmProviders: [],
    }
    const backup = mgr.createBackup(config)
    expect(backup.path).toBeTruthy()
    expect(backup.timestamp).toBeGreaterThan(0)
  })

  it("lists backups sorted by timestamp descending", () => {
    const mgr = new ConfigBackupManager("/tmp/test-backups")
    const config: VibemateExtendedConfig = {
      version: "1.0.0",
      stateDir: ".vibe",
      databaseFile: "state.db",
      telemetryEnabled: true,
      evolutionCadence: "task",
      maxComplexityForInline: 5,
      maxComplexityForSession: 15,
      budget: 10.0,
      llmProviders: [],
    }
    mgr.createBackup(config)
    mgr.createBackup({ ...config, budget: 20.0 })
    const list = mgr.listBackups()
    expect(list.length).toBeGreaterThanOrEqual(2)
    expect(list[0].timestamp).toBeGreaterThanOrEqual(list[1].timestamp)
  })

  it("enforces max backup limit", () => {
    const mgr = new ConfigBackupManager("/tmp/test-backups", 3)
    const config: VibemateExtendedConfig = {
      version: "1.0.0",
      stateDir: ".vibe",
      databaseFile: "state.db",
      telemetryEnabled: true,
      evolutionCadence: "task",
      maxComplexityForInline: 5,
      maxComplexityForSession: 15,
      budget: 10.0,
      llmProviders: [],
    }
    mgr.createBackup(config)
    mgr.createBackup(config)
    mgr.createBackup(config)
    mgr.createBackup(config)
    const list = mgr.listBackups()
    expect(list.length).toBeLessThanOrEqual(3)
  })
})
