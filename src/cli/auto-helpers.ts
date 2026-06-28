import { GovernanceEngine } from '../governance/engine.js';
import { AutoState, CircuitBreaker } from '../types.js';
import { AmbiguityResult } from '../discovery/scoring.js';

export function computeObservationScore(
  errorCount: number,
  durationMs: number,
  consecutiveFailures: number
): number {
  return Math.max(0, 1 - errorCount * 0.3 - (durationMs > 30000 ? 0.2 : 0) - consecutiveFailures * 0.1);
}

export function applyAmbiguityGate(
  ambiguity: AmbiguityResult,
  circuitBreaker: CircuitBreaker
): void {
  if (ambiguity.level === 'high') {
    console.warn(`\n⚠️  High ambiguity detected (score: ${ambiguity.score.toFixed(2)})`);
    if (ambiguity.factors.length > 0) {
      console.warn(`   Factors: ${ambiguity.factors.join(', ')}`);
    }
    circuitBreaker.consecutiveFailures++;
  }
}

export function checkGovernancePermission(role: string, phase: string): boolean {
  const engine = new GovernanceEngine();
  const userId = `auto-agent-${role}`;
  engine.addUser({ id: userId, name: role, roles: [role], createdAt: new Date(), lastActive: new Date() });
  return engine.hasPermission(userId, 'execute', `phase:${phase}`);
}

export function handleHarnessFailure(state: AutoState, circuitBreaker: CircuitBreaker): boolean {
  if (!state.harnessRetried) {
    state.harnessRetried = true;
    state.routerDowngrade = true;
    return true; // caller should retry the phase
  }
  // Second failure: count and reset
  circuitBreaker.consecutiveFailures++;
  state.harnessRetried = false;
  state.routerDowngrade = false;
  return false;
}
