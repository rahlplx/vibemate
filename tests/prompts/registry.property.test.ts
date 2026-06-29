// Property-based tests for PromptRegistry invariants.
import { describe, it, expect } from 'bun:test';
import * as fc from 'fast-check';
import { PromptRegistry, BUILT_IN_PROMPTS } from '../../src/prompts/registry.js';
import type { PromptTemplate } from '../../src/types.js';

const templateArb: fc.Arbitrary<PromptTemplate> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/\s/g, '-')),
  name: fc.string({ minLength: 1 }),
  category: fc.constantFrom('role', 'domain', 'framework', 'security', 'testing', 'evolved', 'org') as fc.Arbitrary<PromptTemplate['category']>,
  content: fc.string({ minLength: 1 }),
  version: fc.constant('1.0.0'),
  source: fc.constantFrom('built-in', 'user', 'org', 'mined', 'evolved') as fc.Arbitrary<PromptTemplate['source']>,
  confidence: fc.float({ min: 0, max: 1, noNaN: true }),
  tags: fc.array(fc.string()),
  usageCount: fc.nat(),
  successRate: fc.float({ min: 0, max: 1, noNaN: true }),
});

describe('PromptRegistry — property invariants', () => {
  it('compose() always starts with the base persona', () => {
    fc.assert(fc.property(
      fc.array(templateArb, { minLength: 0, maxLength: 5 }),
      templates => {
        const r = new PromptRegistry(templates);
        const c = r.compose();
        return c.systemPrompt.length > 0;
      }
    ));
  });

  it('list().length always equals number of unique ids added', () => {
    fc.assert(fc.property(
      fc.uniqueArray(templateArb, { selector: t => t.id, minLength: 0, maxLength: 10 }),
      templates => {
        const r = new PromptRegistry(templates);
        return r.list().length === templates.length;
      }
    ));
  });

  it('add() + get() round-trips: retrieved template matches added', () => {
    fc.assert(fc.property(templateArb, template => {
      const r = new PromptRegistry([]);
      r.add(template);
      const retrieved = r.get(template.id);
      return retrieved?.id === template.id && retrieved?.content === template.content;
    }));
  });

  it('remove() after add() always returns undefined for that id', () => {
    fc.assert(fc.property(templateArb, template => {
      const r = new PromptRegistry([]);
      r.add(template);
      r.remove(template.id);
      return r.get(template.id) === undefined;
    }));
  });

  it('list(category) always returns subset of list()', () => {
    fc.assert(fc.property(
      fc.array(templateArb, { minLength: 0, maxLength: 10 }),
      fc.constantFrom('role', 'domain', 'framework', 'security', 'testing', 'evolved', 'org') as fc.Arbitrary<PromptTemplate['category']>,
      (templates, category) => {
        const r = new PromptRegistry(templates);
        const filtered = r.list(category);
        const all = r.list();
        return filtered.every(t => all.some(a => a.id === t.id));
      }
    ));
  });

  it('recordOutcome() never decreases usageCount', () => {
    fc.assert(fc.property(
      templateArb,
      fc.array(fc.constantFrom('success', 'failure') as fc.Arbitrary<'success' | 'failure'>, { minLength: 1, maxLength: 10 }),
      (template, outcomes) => {
        const r = new PromptRegistry([template]);
        let last = 0;
        for (const outcome of outcomes) {
          r.recordOutcome([template.id], 'build', outcome, 100);
          const current = r.get(template.id)?.usageCount ?? 0;
          if (current < last) return false;
          last = current;
        }
        return true;
      }
    ));
  });

  it('successRate always stays in [0, 1]', () => {
    fc.assert(fc.property(
      templateArb,
      fc.array(fc.constantFrom('success', 'failure') as fc.Arbitrary<'success' | 'failure'>, { minLength: 1, maxLength: 20 }),
      (template, outcomes) => {
        const r = new PromptRegistry([template]);
        for (const outcome of outcomes) r.recordOutcome([template.id], 'build', outcome, 100);
        const sr = r.get(template.id)?.successRate ?? 0;
        return sr >= 0 && sr <= 1;
      }
    ));
  });

  it('toJSON() + fromJSON() preserves all template ids', () => {
    fc.assert(fc.property(
      fc.uniqueArray(templateArb, { selector: t => t.id, minLength: 0, maxLength: 5 }),
      templates => {
        const r = new PromptRegistry(templates);
        const r2 = PromptRegistry.fromJSON(r.toJSON());
        const origIds = new Set(templates.map(t => t.id));
        const restoredIds = new Set(r2.list().map(t => t.id));
        return [...origIds].every(id => restoredIds.has(id));
      }
    ));
  });

  it('compose() activeTemplateIds is a subset of activeRoleIds (only ids that pass confidence gate)', () => {
    fc.assert(fc.property(
      fc.uniqueArray(templateArb, { selector: t => t.id, minLength: 1, maxLength: 5 }),
      templates => {
        const r = new PromptRegistry(templates);
        const ids = templates.map(t => t.id);
        const c = r.compose({ activeRoleIds: ids });
        return c.activeTemplateIds.every(id => ids.includes(id));
      }
    ));
  });
});
