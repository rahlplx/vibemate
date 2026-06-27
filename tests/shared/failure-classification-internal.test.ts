import { describe, expect, it } from "bun:test"
import {
  classifyFailure,
  _internal,
  type FailurePattern,
} from "../../src/shared/failure-classification"

describe("_internal injection", () => {
  it("allows injecting custom network patterns", () => {
    const original = _internal.networkPatterns
    try {
      _internal.networkPatterns = [
        { pattern: /CUSTOM_ERROR/i, kind: "timeout", nextStep: "Custom fix" },
      ]
      const result = classifyFailure(new Error("CUSTOM_ERROR occurred"))
      expect(result.kind).toBe("timeout")
      expect(result.nextStep).toBe("Custom fix")
    } finally {
      _internal.networkPatterns = original
    }
  })

  it("allows injecting custom HTTP patterns", () => {
    const original = _internal.httpPatterns
    try {
      _internal.httpPatterns = [
        { pattern: /999\s*Custom/i, kind: "rate-limit", nextStep: "Custom HTTP fix" },
      ]
      const result = classifyFailure(new Error("999 Custom response"))
      expect(result.kind).toBe("rate-limit")
      expect(result.nextStep).toBe("Custom HTTP fix")
    } finally {
      _internal.httpPatterns = original
    }
  })

  it("allows injecting custom OS patterns", () => {
    const original = _internal.osPatterns
    try {
      _internal.osPatterns = [
        { pattern: /CUSTOM_OS/i, kind: "permission-denied", nextStep: "Custom OS fix" },
      ]
      const result = classifyFailure(new Error("CUSTOM_OS error"))
      expect(result.kind).toBe("permission-denied")
      expect(result.nextStep).toBe("Custom OS fix")
    } finally {
      _internal.osPatterns = original
    }
  })

  it("matchPatterns works directly", () => {
    const patterns: FailurePattern[] = [
      { pattern: /TEST/i, kind: "tool-error", nextStep: "Test fix" },
    ]
    const result = _internal.matchPatterns("TEST error", patterns)
    expect(result).not.toBeNull()
    expect(result!.kind).toBe("tool-error")
  })

  it("matchPatterns returns null for no match", () => {
    const patterns: FailurePattern[] = [
      { pattern: /TEST/i, kind: "tool-error", nextStep: "Test fix" },
    ]
    const result = _internal.matchPatterns("OTHER error", patterns)
    expect(result).toBeNull()
  })

  it("restores patterns after injection", () => {
    const original = _internal.networkPatterns
    const originalLength = original.length
    try {
      _internal.networkPatterns = [
        { pattern: /TEMP/i, kind: "unknown", nextStep: "Temp" },
      ]
      expect(_internal.networkPatterns.length).toBe(1)
    } finally {
      _internal.networkPatterns = original
    }
    expect(_internal.networkPatterns.length).toBe(originalLength)
  })
})
