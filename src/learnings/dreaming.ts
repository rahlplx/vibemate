export type MemoryLayer = "working" | "episodic" | "semantic" | "dreams"

export interface MemoryEntry {
  id: string
  layer: MemoryLayer
  content: string
  tags: string[]
  createdAt: string
  lastRecalledAt?: string
  recalledCount: number
  strength: number
}

export interface ShortTermRecallEntry {
  key: string
  path: string
  startLine: number
  endLine: number
  source: string
  snippet: string
  recallCount: number
  dailyCount: number
  groundedCount: number
  totalScore: number
  maxScore: number
  firstRecalledAt: string
  lastRecalledAt: string
  queryHashes: string[]
  recallDays: string[]
  conceptTags: string[]
}

export interface DreamingPhaseResult {
  staged: ShortTermRecallEntry[]
  themes: string[]
  candidateTruths: Array<{ key: string; snippet: string; confidence: number }>
  promoted: any[]
  wroteToLongTerm: boolean
}

let memoryIdCounter = 0

export function createMemoryEntry(
  layer: MemoryLayer,
  content: string,
  tags: string[],
): MemoryEntry {
  return {
    id: `mem-${++memoryIdCounter}`,
    layer,
    content,
    tags,
    createdAt: new Date().toISOString(),
    recalledCount: 0,
    strength: 1.0,
  }
}

export function computeMemoryStrength(entry: MemoryEntry): number {
  if (!entry.lastRecalledAt) return entry.strength * 0.5

  const ageMs = Date.now() - Date.parse(entry.lastRecalledAt)
  const ageDays = ageMs / (24 * 60 * 60 * 1000)
  const decay = calculateTemporalDecay(ageDays, 30)
  const recallBoost = Math.min(1, Math.log1p(entry.recalledCount) / Math.log1p(10))

  return Math.max(0, Math.min(1, decay * 0.6 + recallBoost * 0.4))
}

export function getForgettingCurveCycle(
  strength: number,
  reviewCount: number,
): { nextReviewDays: number; confidence: number } {
  const baseInterval = Math.pow(2, reviewCount)
  const nextReviewDays = Math.min(365, baseInterval * (1 + strength))
  const confidence = Math.min(1, strength * (1 + Math.log1p(reviewCount) * 0.1))
  return { nextReviewDays, confidence }
}

export function calculateTemporalDecay(ageDays: number, halfLifeDays: number): number {
  return Math.pow(0.5, ageDays / halfLifeDays)
}

export function calculatePromotionScore(entry: ShortTermRecallEntry, options?: { nowMs: number; halfLifeDays: number }) {
  const now = options?.nowMs || Date.now();
  const halfLife = options?.halfLifeDays || 30;

  const ageMs = now - Date.parse(entry.lastRecalledAt);
  const ageDays = ageMs / (24 * 60 * 60 * 1000);

  const recency = calculateTemporalDecay(ageDays, halfLife);
  const frequency = clampScore(entry.recallCount / 10);
  const diversity = clampScore(entry.conceptTags.length / 6);
  const relevance = clampScore(entry.recallDays.length / 3);

  const total = clampScore(frequency * 0.4 + relevance * 0.3 + diversity * 0.2 + recency * 0.1);

  return {
    total,
    components: {
      frequency,
      relevance,
      diversity,
      recency
    }
  };
}

export function shouldReview(entry: MemoryEntry): boolean {
  const strength = computeMemoryStrength(entry)
  return strength < 0.4
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(1, score))
}

export function runLightDreaming(
  entries: ShortTermRecallEntry[],
  options: { limit: number; dedupeSimilarity: number },
): DreamingPhaseResult {
  const sorted = [...entries].sort(
    (a, b) => Date.parse(b.lastRecalledAt) - Date.parse(a.lastRecalledAt),
  )
  const staged = sorted.slice(0, options.limit)

  return {
    staged,
    themes: [],
    candidateTruths: [],
    promoted: [],
    wroteToLongTerm: false,
  }
}

export function runRemDreaming(
  entries: ShortTermRecallEntry[],
  options: { limit: number; minPatternStrength: number },
): DreamingPhaseResult {
  const tagStats = new Map<string, { count: number; evidence: string[] }>()
  for (const entry of entries) {
    for (const tag of entry.conceptTags) {
      if (!tag) continue
      const stat = tagStats.get(tag) ?? { count: 0, evidence: [] }
      stat.count += 1
      stat.evidence.push(`${entry.path}:${entry.startLine}-${entry.endLine}`)
      tagStats.set(tag, stat)
    }
  }

  const themes = [...tagStats.entries()]
    .map(([tag, stat]) => ({
      tag,
      strength: Math.min(1, (stat.count / Math.max(1, entries.length)) * 2),
    }))
    .filter(t => t.strength >= options.minPatternStrength)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, options.limit)
    .map(t => t.tag)

  const candidateTruths = entries
    .filter(e => !("promotedAt" in e && (e as any).promotedAt))
    .map(e => ({
      key: e.key,
      snippet: e.snippet || "(no snippet)",
      confidence: calculatePromotionScore(e).total,
    }))
    .filter(c => c.confidence >= 0.45)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, options.limit)

  return {
    staged: [],
    themes,
    candidateTruths,
    promoted: [],
    wroteToLongTerm: false,
  }
}

export function runDeepDreaming(
  candidates: Array<{ key: string; score: number; snippet: string }>,
  options: { minScore: number; maxPromoted: number },
): DreamingPhaseResult {
  const promoted = candidates
    .filter(c => c.score >= options.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxPromoted)
    .map(c => ({ key: c.key, score: c.score, snippet: c.snippet }))

  return {
    staged: [],
    themes: [],
    candidateTruths: [],
    promoted,
    wroteToLongTerm: promoted.length > 0,
  }
}

export interface MemoryManager {
  add(entry: MemoryEntry): void
  get(id: string): MemoryEntry | undefined
  getByLayer(layer: MemoryLayer): MemoryEntry[]
  remove(id: string): void
  promote(id: string, toLayer: MemoryLayer): void
  list(): MemoryEntry[]
  batchAdd(entries: MemoryEntry[]): void
}

export function createMemoryManager(): MemoryManager {
  const store = new Map<string, MemoryEntry>()

  return {
    add(entry: MemoryEntry) {
      store.set(entry.id, entry)
    },

    batchAdd(entries: MemoryEntry[]) {
      for (const entry of entries) {
        store.set(entry.id, entry)
      }
    },

    get(id: string) {
      return store.get(id)
    },

    getByLayer(layer: MemoryLayer) {
      return [...store.values()].filter(e => e.layer === layer)
    },

    remove(id: string) {
      store.delete(id)
    },

    promote(id: string, toLayer: MemoryLayer) {
      const entry = store.get(id)
      if (entry) {
        store.set(id, { ...entry, layer: toLayer })
      }
    },

    list() {
      return [...store.values()]
    },
  }
}
