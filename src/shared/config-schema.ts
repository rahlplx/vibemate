import * as fs from "fs"
import * as path from "path"

export interface JsonSchema {
  type: string
  properties: Record<string, unknown>
  required: string[]
  additionalProperties?: boolean
}

export function generateJsonSchema(): JsonSchema {
  return {
    type: "object",
    properties: {
      version: {
        type: "string",
        description: "Config schema version",
        pattern: "^\\d+\\.\\d+\\.\\d+$",
      },
      stateDir: {
        type: "string",
        description: "Directory for state storage",
        default: ".vibe",
      },
      databaseFile: {
        type: "string",
        description: "SQLite database filename",
        default: "state.db",
      },
      telemetryEnabled: {
        type: "boolean",
        description: "Enable OpenTelemetry collection",
        default: true,
      },
      evolutionCadence: {
        type: "string",
        description: "How often to run self-improvement",
        enum: ["task", "daily", "weekly"],
        default: "task",
      },
      maxComplexityForInline: {
        type: "number",
        description: "Max complexity score for inline execution",
        minimum: 0,
        default: 5,
      },
      maxComplexityForSession: {
        type: "number",
        description: "Max complexity score for session execution",
        minimum: 1,
        default: 15,
      },
      budget: {
        type: "number",
        description: "Monthly budget in USD",
        minimum: 0,
        default: 10.0,
      },
      llmProviders: {
        type: "array",
        description: "LLM provider configurations",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            apiKey: { type: "string", format: "password" },
            model: { type: "string" },
            maxTokens: { type: "number", minimum: 1 },
            costPer1kInput: { type: "number", minimum: 0 },
            costPer1kOutput: { type: "number", minimum: 0 },
          },
          required: ["name", "apiKey", "model"],
        },
      },
    },
    required: ["version", "stateDir", "budget"],
    additionalProperties: false,
  }
}

export type InputType = "text" | "number" | "boolean" | "select" | "password" | "textarea"

export interface ConfigFieldHint {
  label: string
  description: string
  type: InputType
  group: string
  placeholder?: string
  options?: string[]
  min?: number
  max?: number
}

export type ConfigUiHints = Record<string, ConfigFieldHint>

export function getFieldHints(): ConfigUiHints {
  return {
    version: { label: "Config Version", description: "Schema version for migration", type: "text", group: "general" },
    stateDir: { label: "State Directory", description: "Where to store state files", type: "text", group: "general", placeholder: ".vibe" },
    databaseFile: { label: "Database File", description: "SQLite database filename", type: "text", group: "general", placeholder: "state.db" },
    telemetryEnabled: { label: "Enable Telemetry", description: "Collect anonymous usage data", type: "boolean", group: "privacy" },
    evolutionCadence: { label: "Evolution Cadence", description: "Self-improvement frequency", type: "select", group: "evolution", options: ["task", "daily", "weekly"] },
    maxComplexityForInline: { label: "Inline Complexity Limit", description: "Max score for inline execution", type: "number", group: "execution", min: 0, max: 10 },
    maxComplexityForSession: { label: "Session Complexity Limit", description: "Max score for session execution", type: "number", group: "execution", min: 1, max: 50 },
    budget: { label: "Monthly Budget (USD)", description: "Spending limit per month", type: "number", group: "cost", min: 0, max: 10000 },
  }
}

export interface BackupEntry {
  path: string
  timestamp: number
}

export class ConfigBackupManager {
  private backupDir: string
  private maxBackups: number

  constructor(backupDir: string, maxBackups = 5) {
    this.backupDir = backupDir
    this.maxBackups = maxBackups
  }

  createBackup(config: Record<string, unknown>): BackupEntry {
    fs.mkdirSync(this.backupDir, { recursive: true })
    const timestamp = Date.now()
    const filename = `config-backup-${timestamp}.json`
    const filePath = path.join(this.backupDir, filename)

    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), "utf-8")

    this.pruneOldBackups()

    return { path: filePath, timestamp }
  }

  listBackups(): BackupEntry[] {
    if (!fs.existsSync(this.backupDir)) return []

    return fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith("config-backup-") && f.endsWith(".json"))
      .map(f => {
        const timestamp = parseInt(f.replace("config-backup-", "").replace(".json", ""), 10)
        return { path: path.join(this.backupDir, f), timestamp }
      })
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  private pruneOldBackups(): void {
    const backups = this.listBackups()
    if (backups.length > this.maxBackups) {
      for (const backup of backups.slice(this.maxBackups)) {
        try {
          fs.unlinkSync(backup.path)
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }
}
