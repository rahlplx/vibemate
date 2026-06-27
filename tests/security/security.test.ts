import { describe, it, expect } from "bun:test"
import {
  scanForSecrets,
  SecretFinding,
  SECRET_PATTERNS,
} from "../../src/security/secret-scanner"
import {
  sanitizeConfig,
  sanitizeValue,
} from "../../src/security/credential-filter"
import {
  redact,
  redactFull,
  redactForLog,
} from "../../src/security/redact"

describe("Secret Scanner", () => {
  it("detects OpenAI API keys", () => {
    const findings = scanForSecrets("sk-1234567890abcdef1234567890abcdef")
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0].kind).toContain("openai")
  })

  it("detects GitHub tokens", () => {
    const findings = scanForSecrets("ghp_1234567890abcdef1234567890abcdef12345678")
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0].kind).toContain("github")
  })

  it("detects AWS access keys", () => {
    const findings = scanForSecrets("AKIAIOSFODNN7EXAMPLE")
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0].kind).toContain("aws")
  })

  it("detects PEM private keys", () => {
    const findings = scanForSecrets("-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAK...\n-----END RSA PRIVATE KEY-----")
    expect(findings.length).toBeGreaterThan(0)
    expect(findings[0].kind).toContain("pem")
  })

  it("detects generic API keys", () => {
    const findings = scanForSecrets("api_key=supersecret123")
    expect(findings.length).toBeGreaterThan(0)
  })

  it("returns empty for clean text", () => {
    const findings = scanForSecrets("Hello world, no secrets here")
    expect(findings).toHaveLength(0)
  })

  it("returns empty for placeholder values", () => {
    const findings = scanForSecrets("YOUR_API_KEY_HERE")
    expect(findings).toHaveLength(0)
  })

  it("redacts found secrets in output", () => {
    const result = scanForSecrets("sk-1234567890abcdef1234567890abcdef", { redact: true })
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].redacted).toBeDefined()
    expect(result[0].redacted).not.toBe(result[0].value)
  })
})

describe("Credential Filter", () => {
  it("sanitizes apiKey fields", () => {
    const config = { apiKey: "sk-1234567890abcdef", name: "test" }
    const sanitized = sanitizeConfig(config)
    expect(sanitized.apiKey).toBe("[REDACTED]")
    expect(sanitized.name).toBe("test")
  })

  it("sanitizes token fields", () => {
    const config = { token: "ghp_1234567890abcdef" }
    const sanitized = sanitizeConfig(config)
    expect(sanitized.token).toBe("[REDACTED]")
  })

  it("sanitizes nested fields", () => {
    const config = {
      auth: {
        apiKey: "sk-1234567890abcdef",
        secret: "mysecret",
      },
    }
    const sanitized = sanitizeConfig(config)
    expect(sanitized.auth.apiKey).toBe("[REDACTED]")
    expect(sanitized.auth.secret).toBe("[REDACTED]")
  })

  it("sanitizes values with secret prefixes", () => {
    const result = sanitizeValue("sk-1234567890abcdef")
    expect(result).toBe("[REDACTED]")
  })

  it("preserves non-secret values", () => {
    const result = sanitizeValue("hello world")
    expect(result).toBe("hello world")
  })

  it("preserves env var references", () => {
    const result = sanitizeValue("${API_KEY}")
    expect(result).toBe("${API_KEY}")
  })
})

describe("Redact", () => {
  it("redacts partially (keeps first 4 chars)", () => {
    const result = redact("sk-1234567890abcdef1234567890abcdef")
    expect(result).toContain("sk-1")
    expect(result).not.toBe("sk-1234567890abcdef1234567890abcdef")
  })

  it("redacts fully", () => {
    const result = redactFull("sk-1234567890abcdef1234567890abcdef")
    expect(result).toBe("[REDACTED]")
  })

  it("redacts for log (recursive object)", () => {
    const obj = { apiKey: "sk-1234567890abcdef1234567890abcdef", nested: { token: "ghp_abc1234567890123456789012345678901234" } }
    const result = redactForLog(obj)
    expect(result.apiKey).toBe("[REDACTED]")
    expect(result.nested.token).toBe("[REDACTED]")
  })

  it("handles circular references in redactForLog", () => {
    const obj: Record<string, unknown> = { key: "value" }
    obj.self = obj
    const result = redactForLog(obj)
    expect(result.key).toBe("value")
    expect(result.self).toBe("[Circular]")
  })

  it("preserves non-secret strings", () => {
    const result = redact("hello world")
    expect(result).toBe("hello world")
  })
})
