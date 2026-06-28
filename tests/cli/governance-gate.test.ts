import { describe, it, expect } from 'bun:test';
import { checkGovernancePermission } from '../../src/cli/auto-helpers.js';

describe('GovernanceGate', () => {
  it('allows execution when governance engine permits (default roles)', () => {
    // Default policies give developer role execute permission on all phases
    const allowed = checkGovernancePermission('developer', 'build');
    expect(allowed).toBe(true);
  });

  it('allows all standard pipeline phases by default', () => {
    const phases = ['think', 'plan', 'design', 'break', 'build', 'harness', 'review', 'qa', 'ship', 'retro', 'learn'];
    for (const phase of phases) {
      expect(checkGovernancePermission('developer', phase)).toBe(true);
    }
  });

  it('denies execution when deny-all policy is applied for a specific phase', () => {
    const denied = checkGovernancePermission('guest', 'ship');
    expect(denied).toBe(false);
  });
});
