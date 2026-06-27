const SECRET_PATTERNS_FOR_REDACT = [
  /sk-[a-zA-Z0-9]{20,}/g,
  /ghp_[a-zA-Z0-9]{36,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /sk-ant-[a-zA-Z0-9-]{20,}/g,
  /xox[baprs]-[a-zA-Z0-9-]+/g,
  /npm_[a-zA-Z0-9]{36}/g,
  /AIza[0-9A-Za-z_-]{35}/g,
]

function containsSecret(value: string): boolean {
  return SECRET_PATTERNS_FOR_REDACT.some(p => {
    p.lastIndex = 0
    return p.test(value)
  })
}

function isSensitiveFieldName(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_\s]/g, "")
  return SENSITIVE_FIELD_NAMES.has(normalized) || SENSITIVE_FIELD_NAMES.has(key.toLowerCase())
}

function redactStringPartial(value: string): string {
  if (!containsSecret(value)) return value
  if (value.length <= 8) return "[REDACTED]"
  return value.slice(0, 4) + "*".repeat(value.length - 8) + value.slice(-4)
}

function redactStringFull(value: string): string {
  if (!containsSecret(value)) return value
  return "[REDACTED]"
}

export function redact(value: string): string {
  return redactStringPartial(value)
}

export function redactFull(value: string): string {
  return redactStringFull(value)
}

export function redactForLog(obj: unknown, seen = new WeakSet()): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === "string") return redactStringPartial(obj)
  if (typeof obj === "number" || typeof obj === "boolean") return obj

  if (typeof obj === "object") {
    if (seen.has(obj as object)) return "[Circular]"
    seen.add(obj as object)

    if (Array.isArray(obj)) {
      return obj.map(item => redactForLog(item, seen))
    }

    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === "string" && isSensitiveFieldName(key)) {
        result[key] = "[REDACTED]"
      } else {
        result[key] = redactForLog(value, seen)
      }
    }
    return result
  }

  return obj
}

const SENSITIVE_FIELD_NAMES = new Set([
  "apikey", "api_key", "token", "secret", "password",
  "authorization", "private_key", "client_secret",
])
