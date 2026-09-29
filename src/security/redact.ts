// Pre-compiled non-global regex patterns for secret matching (stateless test)
const SECRET_PATTERNS_FOR_REDACT = [
  /sk-[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{36,}/,
  /AKIA[0-9A-Z]{16}/,
  /sk-ant-[a-zA-Z0-9-]{20,}/,
  /xox[baprs]-[a-zA-Z0-9-]+/,
  /npm_[a-zA-Z0-9]{36}/,
  /AIza[0-9A-Za-z_-]{35}/,
]

// Fast-path secret detection: strings under 6 chars cannot match any secret pattern (shortest is xox[baprs]-)
function containsSecret(value: string): boolean {
  if (value.length < 6) return false
  for (let i = 0; i < SECRET_PATTERNS_FOR_REDACT.length; i++) {
    if (SECRET_PATTERNS_FOR_REDACT[i].test(value)) return true
  }
  return false
}

// Fast field name check with pre-check before expensive string replaces
function isSensitiveFieldName(key: string): boolean {
  const lower = key.toLowerCase()
  if (SENSITIVE_FIELD_NAMES.has(lower)) return true
  if (!lower.includes("-") && !lower.includes("_") && !lower.includes(" ")) return false
  return SENSITIVE_FIELD_NAMES.has(lower.replace(/[-_\s]/g, ""))
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
      const len = obj.length
      const res = new Array(len)
      for (let i = 0; i < len; i++) {
        res[i] = redactForLog(obj[i], seen)
      }
      return res
    }

    const keys = Object.keys(obj as Record<string, unknown>)
    const len = keys.length
    const result: Record<string, unknown> = {}
    for (let i = 0; i < len; i++) {
      const key = keys[i]
      const value = (obj as Record<string, unknown>)[key]
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
  "authorization", "private_key", "privatekey", "client_secret", "clientsecret",
])
