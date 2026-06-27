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

function isSensitiveFieldName(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_\s]/g, "")
  return SENSITIVE_FIELD_NAMES.has(normalized) || SENSITIVE_FIELD_NAMES.has(key.toLowerCase())
}

function hasSecretPrefix(value: string): boolean {
  return SECRET_VALUE_PREFIXES.some(prefix => value.startsWith(prefix))
}

function isEnvVarReference(value: string): boolean {
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

  for (const [key, value] of Object.entries(result)) {
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
