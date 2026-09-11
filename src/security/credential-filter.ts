const SENSITIVE_FIELD_NAMES = new Set([
  "apikey", "api_key", "api-key",
  "token", "access_token", "refresh_token",
  "secret", "secret_key", "secretkey",
  "password", "passwd", "pwd",
  "authorization", "auth_token",
  "private_key", "privatekey",
  "client_secret", "clientsecret",
  "credentials",
])

const SECRET_VALUE_PREFIXES = [
  "sk-", "sk-ant-", "ghp_", "gho_", "ghs_", "ghr_",
  "AKIA", "ASIA",
  "xoxb-", "xoxp-", "xoxa-", "xoxr-",
  "npm_", "AIza",
  "Bearer ",
]

const ENV_VAR_REFERENCE_PATTERN = /^\$\{[^}]+\}$|^<[A-Z_]+>$|^\$[A-Z_]+$/
// Hoist normalization regex to module scope to avoid re-compilation
const NORMALIZE_REGEX = /[-_\s]/g

function isSensitiveFieldName(key: string): boolean {
  const lowerKey = key.toLowerCase()
  // Fast path: direct lookup before regex replacement
  if (SENSITIVE_FIELD_NAMES.has(lowerKey)) return true
  const normalized = lowerKey.replace(NORMALIZE_REGEX, "")
  return SENSITIVE_FIELD_NAMES.has(normalized)
}

// Dynamically derive set of prefix initial characters for safe and maintainable fast-path filtering
const PREFIX_INITIAL_CHARS = new Set(SECRET_VALUE_PREFIXES.map(prefix => prefix[0]))

function hasSecretPrefix(value: string): boolean {
  if (value.length < 3) return false
  // Fast path: skip prefix iterations if initial character doesn't match any secret prefix
  if (!PREFIX_INITIAL_CHARS.has(value[0])) return false
  for (let i = 0; i < SECRET_VALUE_PREFIXES.length; i++) {
    if (value.startsWith(SECRET_VALUE_PREFIXES[i])) return true
  }
  return false
}

function isEnvVarReference(value: string): boolean {
  if (value.length === 0) return false
  // Fast path: skip regex execution if value does not start with '$' or '<'
  const firstChar = value[0]
  if (firstChar !== "$" && firstChar !== "<") return false
  return ENV_VAR_REFERENCE_PATTERN.test(value)
}

export function sanitizeValue(value: unknown): unknown {
  if (typeof value !== "string") return value
  if (isEnvVarReference(value)) return value
  if (hasSecretPrefix(value)) return "[REDACTED]"
  return value
}

export function sanitizeConfig<T extends Record<string, unknown>>(config: T): T {
  const result = { ...config }
  const keys = Object.keys(result)

  // Use indexed loop instead of Object.entries array allocation
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const value = result[key]
    if (isSensitiveFieldName(key)) {
      result[key as keyof T] = "[REDACTED]" as T[keyof T]
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key as keyof T] = sanitizeConfig(value as Record<string, unknown>) as T[keyof T]
    } else if (typeof value === "string") {
      result[key as keyof T] = sanitizeValue(value) as T[keyof T]
    }
  }

  return result
}
