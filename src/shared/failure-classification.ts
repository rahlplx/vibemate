export type FailureKind =
  | "blocked-by-policy"
  | "timeout"
  | "auth-error"
  | "rate-limit"
  | "permission-denied"
  | "not-found"
  | "tool-error"
  | "validation-error"
  | "resource-exhausted"
  | "unsupported"
  | "unknown"

export interface FailureClassification {
  kind: FailureKind
  reason: string
  nextStep: string
  matchedPreset?: string
  confidence: "high" | "low"
}

export type FailurePattern = { pattern: RegExp; kind: FailureKind; nextStep: string }

let networkPatterns: FailurePattern[] = [
  { pattern: /ECONNREFUSED/i, kind: "blocked-by-policy", nextStep: "Check if target host is reachable and port is open" },
  { pattern: /ECONNRESET/i, kind: "blocked-by-policy", nextStep: "Connection was reset — check firewall rules" },
  { pattern: /ETIMEDOUT/i, kind: "timeout", nextStep: "Increase timeout or check network connectivity" },
  { pattern: /ENETUNREACH/i, kind: "blocked-by-policy", nextStep: "Network is unreachable — check routing" },
  { pattern: /EHOSTUNREACH/i, kind: "blocked-by-policy", nextStep: "Host is unreachable — check network policy" },
  { pattern: /EAI_AGAIN/i, kind: "blocked-by-policy", nextStep: "DNS resolution failed — check DNS configuration" },
  { pattern: /ENOTFOUND/i, kind: "not-found", nextStep: "Hostname not found — verify URL" },
  { pattern: /EACCES.*permission/i, kind: "permission-denied", nextStep: "Check file permissions" },
]

let httpPatterns: FailurePattern[] = [
  { pattern: /401\s*Unauthorized/i, kind: "auth-error", nextStep: "Check API key or token — may be expired" },
  { pattern: /403\s*Forbidden/i, kind: "blocked-by-policy", nextStep: "Insufficient permissions — check access scope" },
  { pattern: /429\s*(Too Many|Rate)/i, kind: "rate-limit", nextStep: "Rate limited — implement backoff retry" },
  { pattern: /500\s*Internal/i, kind: "unknown", nextStep: "Server error — retry or check server logs" },
  { pattern: /502\s*Bad\s*Gateway/i, kind: "unknown", nextStep: "Upstream error — retry" },
  { pattern: /503\s*Service/i, kind: "resource-exhausted", nextStep: "Service unavailable — retry with backoff" },
]

let osPatterns: FailurePattern[] = [
  { pattern: /ENOENT/i, kind: "not-found", nextStep: "File or directory does not exist" },
  { pattern: /EACCES/i, kind: "permission-denied", nextStep: "Permission denied — check file permissions" },
  { pattern: /EPERM/i, kind: "permission-denied", nextStep: "Operation not permitted — check privileges" },
  { pattern: /ENOSPC/i, kind: "resource-exhausted", nextStep: "Disk full — free space" },
  { pattern: /EMFILE/i, kind: "resource-exhausted", nextStep: "Too many open files — close other handles" },
]

export const _internal = {
  get networkPatterns() { return networkPatterns },
  set networkPatterns(p: FailurePattern[]) { networkPatterns = p },
  get httpPatterns() { return httpPatterns },
  set httpPatterns(p: FailurePattern[]) { httpPatterns = p },
  get osPatterns() { return osPatterns },
  set osPatterns(p: FailurePattern[]) { osPatterns = p },
  matchPatterns,
}

function matchPatterns(message: string, patterns: Array<{ pattern: RegExp; kind: FailureKind; nextStep: string }>): FailureClassification | null {
  for (const { pattern, kind, nextStep } of patterns) {
    if (pattern.test(message)) {
      return { kind, reason: message, nextStep, confidence: "high" }
    }
  }
  return null
}

export function classifyFailure(err: unknown): FailureClassification {
  const message = err instanceof Error ? err.message : String(err)

  const networkResult = matchPatterns(message, networkPatterns)
  if (networkResult) return networkResult

  const httpResult = matchPatterns(message, httpPatterns)
  if (httpResult) return httpResult

  const osResult = matchPatterns(message, osPatterns)
  if (osResult) return osResult

  return { kind: "unknown", reason: message, nextStep: "Check logs for details", confidence: "low" }
}

export function classifyNetworkFailure(err: unknown): FailureClassification {
  const message = err instanceof Error ? err.message : String(err)
  const result = matchPatterns(message, networkPatterns)
  return result ?? { kind: "unknown", reason: message, nextStep: "Check network configuration", confidence: "low" }
}

export function classifyToolFailure(toolName: string, err: unknown): FailureClassification {
  const message = err instanceof Error ? err.message : String(err)
  return {
    kind: "tool-error",
    reason: `Tool "${toolName}" failed: ${message}`,
    nextStep: `Check tool "${toolName}" configuration and permissions`,
    confidence: "high",
  }
}

export function classifyAuthFailure(err: unknown): FailureClassification {
  const message = err instanceof Error ? err.message : String(err)

  if (/expired/i.test(message)) {
    return { kind: "auth-error", reason: message, nextStep: "Token expired — refresh or rotate credentials", confidence: "high" }
  }
  if (/invalid|incorrect|wrong/i.test(message)) {
    return { kind: "auth-error", reason: message, nextStep: "Invalid credentials — verify API key", confidence: "high" }
  }

  return { kind: "auth-error", reason: message, nextStep: "Check authentication configuration", confidence: "high" }
}

export function formatFailureMessage(classification: FailureClassification): string {
  const parts = [`[${classification.kind}] ${classification.reason}`]
  parts.push(`Next: ${classification.nextStep}`)
  if (classification.matchedPreset) {
    parts.push(`Preset: ${classification.matchedPreset}`)
  }
  parts.push(`Confidence: ${classification.confidence}`)
  return parts.join(" | ")
}
