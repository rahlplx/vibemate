import { GovernanceEngine } from '../governance/engine.js';
import type { Permission } from '../governance/engine.js';
import { AutoState, CircuitBreaker } from '../types.js';
import { AmbiguityResult } from '../discovery/scoring.js';
import { calculateComplexity, determineExecutionMode } from '../execution/gate.js';
import type { LLMTask } from './phase-helpers.js';
import type { PersistenceManager } from '../shared/persistence.js';

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

export async function checkGovernancePermissionWithPersistence(
  role: string,
  phase: string,
  persistence: PersistenceManager,
): Promise<boolean> {
  const store = await persistence.getGovernanceStore();

  // Build a minimal engine (no persistence — audit log stays empty so persist() is cheap)
  const engine = new GovernanceEngine();

  // Load custom roles from DB so any deny policies are respected
  const dbRoles = await store.getAllRoles();
  for (const r of dbRoles) {
    engine.addRole({ name: r.name, permissions: r.permissions as Permission[], description: r.description });
  }

  // Load existing user to preserve original createdAt, or create on first use
  const userId = `auto-agent-${role}`;
  const existingUser = await store.getUser(userId);
  if (existingUser) {
    engine.addUser(existingUser);
  } else {
    engine.addUser({ id: userId, name: role, roles: [role], createdAt: new Date(), lastActive: new Date() });
  }

  const allowed = engine.hasPermission(userId, 'execute', `phase:${phase}`);

  // Persist only the user (updated lastActive) and the new audit entries (not the whole log)
  const user = engine.getUser(userId);
  if (user) await store.saveUser(user);
  for (const entry of engine.getAuditLog()) {
    await store.saveAuditEntry(entry);
  }

  return allowed;
}

export function classifyTasksWithGate(
  tasks: LLMTask[],
  hasUI: boolean,
): (LLMTask & { gatedMode: string })[] {
  return tasks.map(task => {
    const score = calculateComplexity({
      description: task.description,
      filesChanged: task.files.length,
      linesChanged: 0,
      hasTests: task.acceptanceCriteria.some(c => /test/i.test(c)),
      hasUI,
    });
    const gatedMode = determineExecutionMode(score);
    return { ...task, executionMode: gatedMode, gatedMode };
  });
}

export function trackPhaseCost(
  circuitBreaker: CircuitBreaker,
  router: { recordCost: (cost: number) => void },
  estimatedCost: number,
): void {
  circuitBreaker.totalCost += estimatedCost;
  router.recordCost(estimatedCost);
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
