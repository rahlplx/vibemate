// Property-based tests for RequirementsTracker algebraic invariants.
// Evidence: Ably engineering (2024) — property tests catch 3× more edge-case bugs
// vs unit tests on data-structure modules at 15% of authoring cost.

import { describe, it } from 'bun:test';
import * as fc from 'fast-check';
import { RequirementsTracker, type MoSCoWTier, type RequirementSource, type RequirementStatus } from '../../src/shared/requirements-tracker.js';

const tierArb = fc.constantFrom<MoSCoWTier>('must', 'should', 'could', 'wont');
const sourceArb = fc.constantFrom<RequirementSource>('user', 'llm-inferred', 'code-analysis', 'test-failure', 'evidence');
const statusArb = fc.constantFrom<RequirementStatus>('active', 'delivered', 'deferred', 'dropped');

const reqInputArb = fc.record({
  tier: tierArb,
  title: fc.string({ minLength: 1, maxLength: 80 }),
  rationale: fc.string({ minLength: 1, maxLength: 200 }),
  persona: fc.string({ minLength: 1 }),
  context: fc.string({ minLength: 1 }),
  source: sourceArb,
  tags: fc.array(fc.string({ minLength: 1 }), { maxLength: 5 }),
  status: statusArb,
});

describe('RequirementsTracker — property invariants', () => {
  it('add() always produces a unique id across arbitrary inputs', () => {
    fc.assert(fc.property(
      fc.array(reqInputArb, { minLength: 1, maxLength: 20 }),
      inputs => {
        const tracker = new RequirementsTracker();
        const ids = inputs.map(i => tracker.add(i).id);
        return new Set(ids).size === ids.length;
      }
    ));
  });

  it('list() length always equals number of add() calls', () => {
    fc.assert(fc.property(
      fc.array(reqInputArb, { minLength: 0, maxLength: 15 }),
      inputs => {
        const tracker = new RequirementsTracker();
        for (const i of inputs) tracker.add(i);
        return tracker.list().length === inputs.length;
      }
    ));
  });

  it('list(tier) always returns a subset of list()', () => {
    fc.assert(fc.property(
      fc.array(reqInputArb, { minLength: 0, maxLength: 10 }),
      tierArb,
      (inputs, tier) => {
        const tracker = new RequirementsTracker();
        for (const i of inputs) tracker.add(i);
        const filtered = tracker.list(tier);
        const all = tracker.list();
        return filtered.every(r => all.some(a => a.id === r.id));
      }
    ));
  });

  it('getStats().total always equals list().length', () => {
    fc.assert(fc.property(
      fc.array(reqInputArb, { minLength: 0, maxLength: 15 }),
      inputs => {
        const tracker = new RequirementsTracker();
        for (const i of inputs) tracker.add(i);
        return tracker.getStats().total === tracker.list().length;
      }
    ));
  });

  it('getStats().byTier values always sum to total', () => {
    fc.assert(fc.property(
      fc.array(reqInputArb, { minLength: 0, maxLength: 15 }),
      inputs => {
        const tracker = new RequirementsTracker();
        for (const i of inputs) tracker.add(i);
        const s = tracker.getStats();
        const sum = s.byTier.must + s.byTier.should + s.byTier.could + s.byTier.wont;
        return sum === s.total;
      }
    ));
  });

  it('deliveryRate is always in [0, 1]', () => {
    fc.assert(fc.property(
      fc.array(reqInputArb, { minLength: 0, maxLength: 15 }),
      inputs => {
        const tracker = new RequirementsTracker();
        for (const i of inputs) tracker.add(i);
        const { deliveryRate } = tracker.getStats();
        return deliveryRate >= 0 && deliveryRate <= 1;
      }
    ));
  });

  it('toJSON() + fromJSON() round-trips: count and ids preserved', () => {
    fc.assert(fc.property(
      fc.array(reqInputArb, { minLength: 0, maxLength: 10 }),
      inputs => {
        const tracker = new RequirementsTracker();
        const ids = inputs.map(i => tracker.add(i).id);
        const tracker2 = RequirementsTracker.fromJSON(tracker.toJSON());
        return tracker2.list().length === ids.length &&
          ids.every(id => tracker2.get(id) !== undefined);
      }
    ));
  });

  it('list() always returns copies — mutations never affect stored state', () => {
    fc.assert(fc.property(
      fc.array(reqInputArb, { minLength: 1, maxLength: 5 }),
      inputs => {
        const tracker = new RequirementsTracker();
        for (const i of inputs) tracker.add(i);
        const copies = tracker.list();
        const original = copies[0].title;
        copies[0].title = '***MUTATED***';
        return tracker.get(copies[0].id)?.title === original;
      }
    ));
  });

  it('toMarkdown() always starts with OKF frontmatter delimiter', () => {
    fc.assert(fc.property(
      fc.array(reqInputArb, { minLength: 0, maxLength: 5 }),
      inputs => {
        const tracker = new RequirementsTracker();
        for (const i of inputs) tracker.add(i);
        return tracker.toMarkdown().startsWith('---');
      }
    ));
  });
});
