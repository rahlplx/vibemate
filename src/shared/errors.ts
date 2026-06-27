// Unified error hierarchy for Vibemate modules

export const ErrorBrand = Symbol.for('vibemate-error')

export type ErrorCode =
  | 'DISCOVERY_MAX_CYCLES'
  | 'DISCOVERY_TREE_EXHAUSTED'
  | 'DISCOVERY_LLM_UNAVAILABLE'
  | 'SCAFFOLD_TEMPLATE_INVALID'
  | 'SCAFFOLD_FILE_WRITE_FAILED'
  | 'SCAFFOLD_VALIDATION_FAILED'
  | 'SCAFFOLD_PATH_TRAVERSAL'
  | 'DECISION_INVALID_WEIGHTS'
  | 'DECISION_MATRIX_EMPTY'
  | 'DECISION_LLM_UNAVAILABLE'
  | 'STATE_SYNC_CONFLICT'
  | 'STATE_MIGRATION_FAILED'
  | 'STATE_DATABASE_LOCKED'
  | 'EXECUTION_GATE_DENIED'
  | 'EXECUTION_COMPLEXITY_EXCEEDED'
  | 'EXECUTION_CIRCUIT_BREAKER'
  | 'SCALING_WORKER_CRASHED'
  | 'SCALING_ACQUIRE_TIMEOUT'
  | 'SCALING_POOL_EXHAUSTED'
  | 'GOVERNANCE_USER_NOT_FOUND'
  | 'GOVERNANCE_ROLE_NOT_FOUND'
  | 'GOVERNANCE_POLICY_DENIED'
  | 'BROWSER_DAEMON_UNAVAILABLE'
  | 'LLM_PROVIDER_UNAVAILABLE';

export interface VibemateErrorOptions extends ErrorOptions {
  context?: Record<string, unknown>;
}

export function isVibemateError(error: unknown): error is VibemateError {
  return (
    typeof error === 'object' &&
    error !== null &&
    ErrorBrand in error
  );
}

export class VibemateError extends Error {
  readonly [ErrorBrand] = true;
  readonly code: string;
  readonly context?: Record<string, unknown>;

  constructor(code: string, message: string, options?: VibemateErrorOptions) {
    super(message, options);
    this.name = 'VibemateError';
    this.code = code;
    this.context = options?.context;
  }
}

export class DiscoveryError extends VibemateError {
  constructor(code: string, message: string, options?: VibemateErrorOptions) {
    super(`DISCOVERY_${code}`, message, options);
    this.name = 'DiscoveryError';
  }
}

export class ScaffoldError extends VibemateError {
  constructor(code: string, message: string, options?: VibemateErrorOptions) {
    super(`SCAFFOLD_${code}`, message, options);
    this.name = 'ScaffoldError';
  }
}

export class DecisionError extends VibemateError {
  constructor(code: string, message: string, options?: VibemateErrorOptions) {
    super(`DECISION_${code}`, message, options);
    this.name = 'DecisionError';
  }
}

export class StateError extends VibemateError {
  constructor(code: string, message: string, options?: VibemateErrorOptions) {
    super(`STATE_${code}`, message, options);
    this.name = 'StateError';
  }
}

export class ExecutionError extends VibemateError {
  constructor(code: string, message: string, options?: VibemateErrorOptions) {
    super(`EXECUTION_${code}`, message, options);
    this.name = 'ExecutionError';
  }
}

export class ScalingError extends VibemateError {
  constructor(code: string, message: string, options?: VibemateErrorOptions) {
    super(`SCALING_${code}`, message, options);
    this.name = 'ScalingError';
  }
}

export class GovernanceError extends VibemateError {
  constructor(code: string, message: string, options?: VibemateErrorOptions) {
    super(`GOVERNANCE_${code}`, message, options);
    this.name = 'GovernanceError';
  }
}
