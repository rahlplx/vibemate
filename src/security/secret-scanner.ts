export interface SecretPattern {
  name: string
  kind: string
  pattern: RegExp
  confidence: "high" | "medium" | "low"
}

export interface SecretFinding {
  kind: string
  value: string
  redacted?: string
  confidence: "high" | "medium" | "low"
  line?: number
}

export const SECRET_PATTERNS: SecretPattern[] = [
  { name: "OpenAI API Key", kind: "openai-api-key", pattern: /sk-[a-zA-Z0-9]{20,}/g, confidence: "high" },
  { name: "GitHub Token", kind: "github-token", pattern: /ghp_[a-zA-Z0-9]{36,}/g, confidence: "high" },
  { name: "GitHub OAuth", kind: "github-oauth", pattern: /gho_[a-zA-Z0-9]{36,}/g, confidence: "high" },
  { name: "AWS Access Key", kind: "aws-access-key", pattern: /AKIA[0-9A-Z]{12,}/g, confidence: "high" },
  { name: "AWS Secret Key", kind: "aws-secret-key", pattern: /(?:aws_secret_access_key|secret_key)\s*[=:]\s*[a-zA-Z0-9/+=]{40}/gi, confidence: "high" },
  { name: "Anthropic API Key", kind: "anthropic-api-key", pattern: /sk-ant-[a-zA-Z0-9-]{20,}/g, confidence: "high" },
  { name: "Slack Token", kind: "slack-token", pattern: /xox[baprs]-[a-zA-Z0-9-]+/g, confidence: "high" },
  { name: "Discord Token", kind: "discord-token", pattern: /[MN][a-zA-Z0-9]{23,}\.[a-zA-Z0-9]{6}\.[a-zA-Z0-9_-]{27,}/g, confidence: "medium" },
  { name: "Telegram Bot Token", kind: "telegram-token", pattern: /\d{8,10}:[a-zA-Z0-9_-]{35}/g, confidence: "medium" },
  { name: "npm Token", kind: "npm-token", pattern: /npm_[a-zA-Z0-9]{36}/g, confidence: "high" },
  { name: "Google API Key", kind: "google-api-key", pattern: /AIza[0-9A-Za-z_-]{35}/g, confidence: "high" },
  { name: "PEM Private Key", kind: "pem-private-key", pattern: /-----BEGIN[A-Z ]+PRIVATE KEY-----[\s\S]+?-----END[A-Z ]+PRIVATE KEY-----/g, confidence: "high" },
  { name: "Generic Secret Assignment", kind: "generic-secret", pattern: /(?:secret|password|passwd|pwd)\s*[=:]\s*["']?[^\s"']{8,}["']?/gi, confidence: "low" },
  { name: "Generic API Key Assignment", kind: "generic-api-key", pattern: /(?:api[_-]?key|apikey)\s*[=:]\s*["']?[^\s"']{8,}["']?/gi, confidence: "low" },
]

const PLACEHOLDER_PATTERNS = [
  /^YOUR_.*_HERE$/i,
  /^PLACEHOLDER$/i,
  /^xxx+$/i,
  /^change_me$/i,
  /^<.*>$/,
  /^example$/i,
  /^test$/i,
  /^fake$/i,
  /^dummy$/i,
]

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some(p => p.test(value))
}

function redactSecret(value: string): string {
  if (value.length <= 8) return "[REDACTED]"
  return value.slice(0, 4) + "*".repeat(value.length - 8) + value.slice(-4)
}

const MULTILINE_KINDS = new Set(["pem-private-key"])

export function scanForSecrets(
  text: string,
  options: { redact?: boolean } = {},
): SecretFinding[] {
  const findings: SecretFinding[] = []

  for (const { kind, pattern, confidence } of SECRET_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags)

    if (MULTILINE_KINDS.has(kind)) {
      let match: RegExpExecArray | null
      while ((match = regex.exec(text)) !== null) {
        const value = match[0]
        if (!isPlaceholder(value)) {
          findings.push({
            kind,
            value,
            redacted: options.redact ? redactSecret(value) : undefined,
            confidence,
            line: text.slice(0, match.index).split("\n").length,
          })
        }
      }
    } else {
      const lines = text.split("\n")
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const lineRegex = new RegExp(pattern.source, pattern.flags)
        let match: RegExpExecArray | null

        while ((match = lineRegex.exec(line)) !== null) {
          const value = match[0]
          if (!isPlaceholder(value)) {
            findings.push({
              kind,
              value,
              redacted: options.redact ? redactSecret(value) : undefined,
              confidence,
              line: i + 1,
            })
          }
        }
      }
    }
  }

  return findings
}
