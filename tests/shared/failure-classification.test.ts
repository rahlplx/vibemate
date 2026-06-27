import { describe, it, expect } from "bun:test"
import {
  classifyFailure,
  classifyNetworkFailure,
  classifyToolFailure,
  classifyAuthFailure,
  formatFailureMessage,
  type FailureClassification,
  type FailureKind,
} from "../../src/shared/failure-classification"

describe("Failure Classification", () => {
  describe("classifyFailure", () => {
    it("classifies network errors as blocked-by-policy", () => {
      const err = new Error("ECONNREFUSED 127.0.0.1:443")
      const result = classifyFailure(err)
      expect(result.kind).toBe("blocked-by-policy")
      expect(result.confidence).toBe("high")
      expect(result.nextStep).toBeDefined()
    })

    it("classifies timeout errors", () => {
      const err = new Error("ETIMEDOUT")
      const result = classifyFailure(err)
      expect(result.kind).toBe("timeout")
      expect(result.confidence).toBe("high")
    })

    it("classifies auth errors", () => {
      const err = new Error("401 Unauthorized")
      const result = classifyFailure(err)
      expect(result.kind).toBe("auth-error")
      expect(result.confidence).toBe("high")
    })

    it("classifies rate limit errors", () => {
      const err = new Error("429 Too Many Requests")
      const result = classifyFailure(err)
      expect(result.kind).toBe("rate-limit")
      expect(result.confidence).toBe("high")
    })

    it("classifies permission errors", () => {
      const err = new Error("EACCES: permission denied")
      const result = classifyFailure(err)
      expect(result.kind).toBe("permission-denied")
      expect(result.confidence).toBe("high")
    })

    it("classifies not-found errors", () => {
      const err = new Error("ENOENT: no such file or directory")
      const result = classifyFailure(err)
      expect(result.kind).toBe("not-found")
      expect(result.confidence).toBe("high")
    })

    it("returns unknown for unrecognized errors", () => {
      const err = new Error("something weird happened")
      const result = classifyFailure(err)
      expect(result.kind).toBe("unknown")
      expect(result.confidence).toBe("low")
    })

    it("handles non-Error values", () => {
      const result = classifyFailure("string error")
      expect(result.kind).toBe("unknown")
      expect(result.confidence).toBe("low")
    })
  })

  describe("classifyNetworkFailure", () => {
    it("detects DNS resolution failures", () => {
      const result = classifyNetworkFailure(new Error("EAI_AGAIN: temporary failure"))
      expect(result.kind).toBe("blocked-by-policy")
      expect(result.nextStep).toContain("DNS")
    })

    it("detects connection refused", () => {
      const result = classifyNetworkFailure(new Error("ECONNREFUSED"))
      expect(result.kind).toBe("blocked-by-policy")
    })

    it("detects network unreachable", () => {
      const result = classifyNetworkFailure(new Error("ENETUNREACH"))
      expect(result.kind).toBe("blocked-by-policy")
    })
  })

  describe("classifyToolFailure", () => {
    it("classifies tool not found", () => {
      const result = classifyToolFailure("nonexistent-tool", new Error("not found"))
      expect(result.kind).toBe("tool-error")
      expect(result.reason).toContain("nonexistent-tool")
    })

    it("classifies tool execution error", () => {
      const result = classifyToolFailure("bash", new Error("command failed"))
      expect(result.kind).toBe("tool-error")
    })
  })

  describe("classifyAuthFailure", () => {
    it("classifies expired token", () => {
      const result = classifyAuthFailure(new Error("token expired"))
      expect(result.kind).toBe("auth-error")
      expect(result.nextStep.toLowerCase()).toContain("token")
    })

    it("classifies invalid credentials", () => {
      const result = classifyAuthFailure(new Error("invalid API key"))
      expect(result.kind).toBe("auth-error")
    })
  })

  describe("formatFailureMessage", () => {
    it("formats classification into human-readable message", () => {
      const classification: FailureClassification = {
        kind: "blocked-by-policy",
        reason: "Connection to 10.0.0.1 refused",
        nextStep: "Check network policy rules",
        confidence: "high",
      }
      const msg = formatFailureMessage(classification)
      expect(msg).toContain("blocked-by-policy")
      expect(msg).toContain("Connection to 10.0.0.1 refused")
      expect(msg).toContain("Check network policy rules")
    })

    it("includes matched preset when present", () => {
      const classification: FailureClassification = {
        kind: "blocked-by-policy",
        reason: "Host blocked",
        nextStep: "Add to allowlist",
        matchedPreset: "restricted",
        confidence: "high",
      }
      const msg = formatFailureMessage(classification)
      expect(msg).toContain("restricted")
    })
  })
})
