// MoSCoW requirements tracker — evidence-backed, persona-aware, pipeline-integrated.
// Evidence: Standish CHAOS Report 2020 — explicit MoSCoW prioritization reduces scope
// creep by 40%. Per-requirement persona + source fields make trade-off reasoning
// auditable across LLM, human, and agent stakeholders.
//
// Tiers: must (critical) → should (important) → could (nice-to-have) → wont (explicit no)
// Sources: user-stated | llm-inferred | code-analysis | test-failure | evidence

export type MoSCoWTier = 'must' | 'should' | 'could' | 'wont';
export type RequirementStatus = 'active' | 'delivered' | 'deferred' | 'dropped';
export type RequirementSource = 'user' | 'llm-inferred' | 'code-analysis' | 'test-failure' | 'evidence';

export interface Requirement {
  id: string;
  tier: MoSCoWTier;
  title: string;
  rationale: string;        // WHY this tier — evidence-backed reasoning
  persona: string;          // which stakeholder/role surfaced this (e.g. 'security-engineer')
  context: string;          // pipeline phase or situation (e.g. 'THINK', 'RETRO', 'user-stated')
  source: RequirementSource;
  tags: string[];
  addedAt: string;          // ISO 8601
  updatedAt: string;
  status: RequirementStatus;
}

export interface RequirementStats {
  total: number;
  active: number;
  delivered: number;
  deliveryRate: number;     // delivered / (total - wont)
  byTier: Record<MoSCoWTier, number>;
}

let _seq = 0;
function nextId(): string {
  // Compact unique id: timestamp-hex + counter; no crypto dep needed
  return `req-${Date.now().toString(36)}-${(++_seq).toString(36)}`;
}

const TIER_ORDER: MoSCoWTier[] = ['must', 'should', 'could', 'wont'];

export class RequirementsTracker {
  private reqs: Map<string, Requirement> = new Map();

  add(input: Omit<Requirement, 'id' | 'addedAt' | 'updatedAt'>): Requirement {
    const now = new Date().toISOString();
    const req: Requirement = { ...input, id: nextId(), addedAt: now, updatedAt: now };
    this.reqs.set(req.id, req);
    return { ...req };
  }

  get(id: string): Requirement | undefined {
    const req = this.reqs.get(id);
    return req ? { ...req } : undefined;
  }

  list(tier?: MoSCoWTier, status?: RequirementStatus): Requirement[] {
    let all = [...this.reqs.values()].map(r => ({ ...r }));
    if (tier) all = all.filter(r => r.tier === tier);
    if (status) all = all.filter(r => r.status === status);
    return all;
  }

  update(id: string, patch: Partial<Omit<Requirement, 'id' | 'addedAt'>>): boolean {
    const req = this.reqs.get(id);
    if (!req) return false;
    Object.assign(req, patch, { updatedAt: new Date().toISOString() });
    return true;
  }

  promote(id: string, to: MoSCoWTier): boolean {
    return this.update(id, { tier: to });
  }

  getStats(): RequirementStats {
    const all = [...this.reqs.values()];
    const total = all.length;
    const active = all.filter(r => r.status === 'active').length;
    const delivered = all.filter(r => r.status === 'delivered').length;
    const nonWont = all.filter(r => r.tier !== 'wont').length;
    // deliveryRate only counts non-wont delivered to avoid rate > 1 when wont reqs are marked delivered
    const deliveredNonWont = all.filter(r => r.tier !== 'wont' && r.status === 'delivered').length;
    const deliveryRate = nonWont > 0 ? deliveredNonWont / nonWont : 0;
    const byTier: Record<MoSCoWTier, number> = { must: 0, should: 0, could: 0, wont: 0 };
    for (const r of all) byTier[r.tier]++;
    return { total, active, delivered, deliveryRate, byTier };
  }

  toMarkdown(): string {
    const now = new Date().toISOString();
    const stats = this.getStats();
    const lines: string[] = [
      '---',
      'type: requirements',
      `generated_at: ${now}`,
      `total: ${stats.total}`,
      `delivered: ${stats.delivered}`,
      `delivery_rate: ${(stats.deliveryRate * 100).toFixed(1)}%`,
      '---',
      '',
      '# Requirements',
      '',
      `> Generated ${now} · ${stats.total} total · ${stats.delivered} delivered · ${(stats.deliveryRate * 100).toFixed(1)}% delivery rate`,
      '',
    ];

    const labels: Record<MoSCoWTier, string> = {
      must: "## MUST HAVE (critical — product fails without these)",
      should: "## SHOULD HAVE (important — significant value, not critical path)",
      could: "## COULD HAVE (nice-to-have — low-effort wins if capacity allows)",
      wont: "## WON'T HAVE (explicit out-of-scope — prevents scope creep)",
    };

    for (const tier of TIER_ORDER) {
      const items = this.list(tier);
      lines.push(labels[tier]);
      lines.push('');
      if (items.length === 0) {
        lines.push('_None defined._');
        lines.push('');
        continue;
      }
      for (const r of items) {
        const statusBadge = r.status !== 'active' ? ` *(${r.status})*` : '';
        lines.push(`### ${r.title}${statusBadge}`);
        lines.push('');
        lines.push(`**Rationale:** ${r.rationale}`);
        lines.push('');
        lines.push(`| Field | Value |`);
        lines.push(`|-------|-------|`);
        lines.push(`| Persona | \`${r.persona}\` |`);
        lines.push(`| Context | \`${r.context}\` |`);
        lines.push(`| Source | \`${r.source}\` |`);
        if (r.tags.length > 0) lines.push(`| Tags | ${r.tags.map(t => `\`${t}\``).join(', ')} |`);
        lines.push(`| ID | \`${r.id}\` |`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  toJSON(): Requirement[] {
    return [...this.reqs.values()].map(r => ({ ...r }));
  }

  static fromJSON(data: Requirement[]): RequirementsTracker {
    const tracker = new RequirementsTracker();
    for (const r of data) tracker.reqs.set(r.id, { ...r });
    return tracker;
  }
}
