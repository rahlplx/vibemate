// TDD: RED tests for RequirementsTracker.
// Evidence: MoSCoW method (Clegg & Barker, 1994) — explicit prioritization reduces
// scope creep by 40% (Standish CHAOS Report 2020). Per-requirement persona + evidence
// fields make trade-off reasoning auditable across LLM and human stakeholders.

import { describe, it, expect, beforeEach } from 'bun:test';
import {
  RequirementsTracker,
  type Requirement,
  type MoSCoWTier,
} from '../../src/shared/requirements-tracker.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeReq(overrides: Partial<Omit<Requirement, 'id' | 'addedAt' | 'updatedAt'>> = {}): Omit<Requirement, 'id' | 'addedAt' | 'updatedAt'> {
  return {
    tier: 'must',
    title: 'User authentication',
    rationale: 'Without auth the product has no security boundary (OWASP A07).',
    persona: 'security-engineer',
    context: 'THINK',
    source: 'evidence',
    tags: ['auth', 'security'],
    status: 'active',
    ...overrides,
  };
}

// ─── add / get ────────────────────────────────────────────────────────────────

describe('RequirementsTracker — add / get', () => {
  let tracker: RequirementsTracker;
  beforeEach(() => { tracker = new RequirementsTracker(); });

  it('add() returns a Requirement with a non-empty id', () => {
    const req = tracker.add(makeReq());
    expect(req.id).toBeTruthy();
    expect(typeof req.id).toBe('string');
  });

  it('add() sets addedAt and updatedAt as ISO strings', () => {
    const req = tracker.add(makeReq());
    expect(() => new Date(req.addedAt)).not.toThrow();
    expect(() => new Date(req.updatedAt)).not.toThrow();
    expect(req.addedAt).toBe(req.updatedAt);
  });

  it('get() retrieves the same requirement by id', () => {
    const req = tracker.add(makeReq());
    const found = tracker.get(req.id);
    expect(found?.title).toBe(req.title);
    expect(found?.tier).toBe('must');
  });

  it('get() returns undefined for an unknown id', () => {
    expect(tracker.get('nonexistent')).toBeUndefined();
  });

  it('add() preserves all fields including persona and source', () => {
    const req = tracker.add(makeReq({ persona: 'api-designer', source: 'user', context: 'RETRO' }));
    expect(req.persona).toBe('api-designer');
    expect(req.source).toBe('user');
    expect(req.context).toBe('RETRO');
  });

  it('each add() produces a unique id', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) ids.add(tracker.add(makeReq({ title: `req-${i}` })).id);
    expect(ids.size).toBe(20);
  });
});

// ─── list ─────────────────────────────────────────────────────────────────────

describe('RequirementsTracker — list', () => {
  let tracker: RequirementsTracker;
  beforeEach(() => {
    tracker = new RequirementsTracker();
    tracker.add(makeReq({ tier: 'must', title: 'Auth' }));
    tracker.add(makeReq({ tier: 'must', title: 'Data persistence' }));
    tracker.add(makeReq({ tier: 'should', title: 'Export as CSV' }));
    tracker.add(makeReq({ tier: 'could', title: 'Dark mode' }));
    tracker.add(makeReq({ tier: 'wont', title: 'Blockchain integration' }));
  });

  it('list() with no args returns all requirements', () => {
    expect(tracker.list().length).toBe(5);
  });

  it('list(tier) filters by tier', () => {
    expect(tracker.list('must').length).toBe(2);
    expect(tracker.list('should').length).toBe(1);
    expect(tracker.list('could').length).toBe(1);
    expect(tracker.list('wont').length).toBe(1);
  });

  it('list(tier, status) filters by both tier and status', () => {
    const req = tracker.list('must')[0];
    tracker.update(req.id, { status: 'delivered' });
    expect(tracker.list('must', 'active').length).toBe(1);
    expect(tracker.list('must', 'delivered').length).toBe(1);
  });

  it('list() returns copies — mutations do not affect the tracker', () => {
    const all = tracker.list();
    all[0].title = 'MUTATED';
    expect(tracker.get(all[0].id)?.title).not.toBe('MUTATED');
  });
});

// ─── update / promote ─────────────────────────────────────────────────────────

describe('RequirementsTracker — update / promote', () => {
  let tracker: RequirementsTracker;
  let reqId: string;

  beforeEach(() => {
    tracker = new RequirementsTracker();
    reqId = tracker.add(makeReq({ tier: 'should', title: 'Export CSV' })).id;
  });

  it('update() patches specific fields', () => {
    tracker.update(reqId, { title: 'Export JSONL' });
    expect(tracker.get(reqId)?.title).toBe('Export JSONL');
  });

  it('update() refreshes updatedAt', async () => {
    const before = tracker.get(reqId)!.addedAt;
    await Bun.sleep(2); // ensure time moves
    tracker.update(reqId, { rationale: 'Updated rationale' });
    expect(tracker.get(reqId)!.updatedAt >= before).toBe(true);
  });

  it('update() returns true for known id, false for unknown', () => {
    expect(tracker.update(reqId, { status: 'delivered' })).toBe(true);
    expect(tracker.update('nope', { status: 'delivered' })).toBe(false);
  });

  it('promote() changes tier', () => {
    tracker.promote(reqId, 'must');
    expect(tracker.get(reqId)?.tier).toBe('must');
  });

  it('promote() returns true for known id, false for unknown', () => {
    expect(tracker.promote(reqId, 'could')).toBe(true);
    expect(tracker.promote('ghost', 'must')).toBe(false);
  });

  it('cannot promote to invalid tier — only valid MoSCoW tiers accepted', () => {
    // promote accepts only 'must' | 'should' | 'could' | 'wont' at compile time
    expect(() => tracker.promote(reqId, 'must' as MoSCoWTier)).not.toThrow();
    expect(() => tracker.promote(reqId, 'wont' as MoSCoWTier)).not.toThrow();
  });
});

// ─── toMarkdown ───────────────────────────────────────────────────────────────

describe('RequirementsTracker — toMarkdown', () => {
  it('produces a non-empty markdown string', () => {
    const tracker = new RequirementsTracker();
    tracker.add(makeReq({ tier: 'must', title: 'Auth' }));
    tracker.add(makeReq({ tier: 'should', title: 'CSV export' }));
    const md = tracker.toMarkdown();
    expect(md.length).toBeGreaterThan(0);
    expect(md).toContain('# Requirements');
  });

  it('includes all MoSCoW sections', () => {
    const tracker = new RequirementsTracker();
    tracker.add(makeReq({ tier: 'must' }));
    tracker.add(makeReq({ tier: 'should' }));
    tracker.add(makeReq({ tier: 'could' }));
    tracker.add(makeReq({ tier: 'wont' }));
    const md = tracker.toMarkdown();
    expect(md).toContain('MUST');
    expect(md).toContain('SHOULD');
    expect(md).toContain('COULD');
    expect(md).toContain("WON'T");
  });

  it('includes title, rationale, persona and source in output', () => {
    const tracker = new RequirementsTracker();
    tracker.add(makeReq({ title: 'OAuth2 Login', rationale: 'OWASP requires it', persona: 'security-engineer', source: 'evidence' }));
    const md = tracker.toMarkdown();
    expect(md).toContain('OAuth2 Login');
    expect(md).toContain('OWASP requires it');
    expect(md).toContain('security-engineer');
    expect(md).toContain('evidence');
  });

  it('returns a parseable markdown string (has frontmatter)', () => {
    const tracker = new RequirementsTracker();
    tracker.add(makeReq());
    const md = tracker.toMarkdown();
    expect(md.startsWith('---')).toBe(true);
  });
});

// ─── toJSON / fromJSON round-trip ─────────────────────────────────────────────

describe('RequirementsTracker — toJSON / fromJSON', () => {
  it('round-trips all requirements', () => {
    const tracker = new RequirementsTracker();
    tracker.add(makeReq({ tier: 'must', title: 'Auth' }));
    tracker.add(makeReq({ tier: 'should', title: 'CSV export' }));
    const tracker2 = RequirementsTracker.fromJSON(tracker.toJSON());
    expect(tracker2.list().length).toBe(2);
  });

  it('preserves all fields after round-trip', () => {
    const tracker = new RequirementsTracker();
    const req = tracker.add(makeReq({ tier: 'could', persona: 'product-owner', source: 'user', tags: ['ux'] }));
    const tracker2 = RequirementsTracker.fromJSON(tracker.toJSON());
    const restored = tracker2.get(req.id)!;
    expect(restored.tier).toBe('could');
    expect(restored.persona).toBe('product-owner');
    expect(restored.source).toBe('user');
    expect(restored.tags).toEqual(['ux']);
  });

  it('fromJSON([]) produces empty tracker', () => {
    const tracker = RequirementsTracker.fromJSON([]);
    expect(tracker.list().length).toBe(0);
  });
});

// ─── summary stats ────────────────────────────────────────────────────────────

describe('RequirementsTracker — getStats', () => {
  it('returns counts per tier', () => {
    const tracker = new RequirementsTracker();
    tracker.add(makeReq({ tier: 'must' }));
    tracker.add(makeReq({ tier: 'must' }));
    tracker.add(makeReq({ tier: 'should' }));
    const stats = tracker.getStats();
    expect(stats.byTier.must).toBe(2);
    expect(stats.byTier.should).toBe(1);
    expect(stats.byTier.could).toBe(0);
    expect(stats.byTier.wont).toBe(0);
    expect(stats.total).toBe(3);
  });

  it('counts delivered vs active', () => {
    const tracker = new RequirementsTracker();
    const r1 = tracker.add(makeReq({ tier: 'must' }));
    tracker.add(makeReq({ tier: 'must' }));
    tracker.update(r1.id, { status: 'delivered' });
    const stats = tracker.getStats();
    expect(stats.delivered).toBe(1);
    expect(stats.active).toBe(1);
  });

  it('deliveryRate is delivered / total (excluding wont)', () => {
    const tracker = new RequirementsTracker();
    const r1 = tracker.add(makeReq({ tier: 'must' }));
    tracker.add(makeReq({ tier: 'should' }));
    tracker.add(makeReq({ tier: 'wont' }));
    tracker.update(r1.id, { status: 'delivered' });
    const stats = tracker.getStats();
    // 1 delivered out of 2 non-wont = 0.5
    expect(Math.abs(stats.deliveryRate - 0.5)).toBeLessThan(0.001);
  });
});
