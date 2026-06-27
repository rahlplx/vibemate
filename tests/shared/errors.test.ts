import { describe, expect, it } from "bun:test"
import {
  VibemateError,
  DiscoveryError,
  ScaffoldError,
  DecisionError,
  StateError,
  ExecutionError,
  ScalingError,
  GovernanceError,
  ErrorBrand,
  isVibemateError,
} from "../../src/shared/errors"

describe("Symbol-based error markers", () => {
  it("marks VibemateError with ErrorBrand symbol", () => {
    const err = new VibemateError("TEST_CODE", "test message")
    expect(err[ErrorBrand]).toBe(true)
    expect(isVibemateError(err)).toBe(true)
  })

  it("marks domain errors with ErrorBrand symbol", () => {
    const discovery = new DiscoveryError("MAX_CYCLES", "max reached")
    const scaffold = new ScaffoldError("TEMPLATE_INVALID", "bad template")
    const decision = new DecisionError("MATRIX_EMPTY", "empty")
    const state = new StateError("DATABASE_LOCKED", "locked")
    const execution = new ExecutionError("GATE_DENIED", "denied")
    const scaling = new ScalingError("WORKER_CRASHED", "crashed")
    const governance = new GovernanceError("POLICY_DENIED", "denied")

    expect(discovery[ErrorBrand]).toBe(true)
    expect(scaffold[ErrorBrand]).toBe(true)
    expect(decision[ErrorBrand]).toBe(true)
    expect(state[ErrorBrand]).toBe(true)
    expect(execution[ErrorBrand]).toBe(true)
    expect(scaling[ErrorBrand]).toBe(true)
    expect(governance[ErrorBrand]).toBe(true)
  })

  it("isVibemateError returns false for non-VibemateError", () => {
    expect(isVibemateError(new Error("plain"))).toBe(false)
    expect(isVibemateError(null)).toBe(false)
    expect(isVibemateError(undefined)).toBe(false)
    expect(isVibemateError("string")).toBe(false)
    expect(isVibemateError({})).toBe(false)
  })

  it("isVibemateError returns true for subclass instances", () => {
    expect(isVibemateError(new DiscoveryError("X", "msg"))).toBe(true)
    expect(isVibemateError(new ScaffoldError("X", "msg"))).toBe(true)
  })

  it("preserves error properties across brands", () => {
    const err = new VibemateError("CODE", "msg", { context: { key: "value" } })
    expect(err.code).toBe("CODE")
    expect(err.context).toEqual({ key: "value" })
    expect(err.message).toBe("msg")
    expect(err[ErrorBrand]).toBe(true)
  })
})
