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

export function shouldReview(entry: MemoryEntry): boolean {
  if (!entry.lastRecalledAt) return true
  const ageMs = Date.now() - Date.parse(entry.lastRecalledAt)
  const ageDays = ageMs / (24 * 60 * 60 * 1000)
  const { nextReviewDays } = getForgettingCurveCycle(entry.strength, entry.recalledCount)
  return ageDays >= nextReviewDays
}

export function updateMemory(entry: MemoryEntry, recalled: boolean): MemoryEntry {
  if (!recalled) return entry
  return {
    ...entry,
    lastRecalledAt: new Date().toISOString(),
    recalledCount: entry.recalledCount + 1,
    strength: Math.min(1, entry.strength + 0.05),
  }
}

export function calculateTemporalDecay(ageDays: number, halfLifeDays: number): number {
  if (ageDays <= 0) return 1.0
  if (halfLifeDays <= 0) return 1.0
  const lambda = Math.LN2 / halfLifeDays
  return Math.exp(-lambda * ageDays)
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

export interface PromotionWeights {
  frequency: number
  relevance: number
  diversity: number
  recency: number
  consolidation: number
  conceptual: number
}

const DEFAULT_PROMOTION_WEIGHTS: PromotionWeights = {
  frequency: 0.24,
  relevance: 0.30,
  diversity: 0.15,
  recency: 0.15,
  consolidation: 0.10,
  conceptual: 0.06,
}

function clampScore(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function calculateFrequencyComponent(recallCount: number): number {
  return clampScore(Math.log1p(recallCount) / Math.log1p(10))
}

function calculateRelevanceComponent(avgScore: number): number {
  return clampScore(avgScore)
}

function calculateDiversityComponent(queryCount: number, recallDays: string[]): number {
  const contextDiversity = Math.max(queryCount, recallDays.length)
  return clampScore(contextDiversity / 5)
}

function calculateRecencyComponent(ageDays: number, halfLifeDays: number): number {
  return calculateTemporalDecay(ageDays, halfLifeDays)
}

function calculateConsolidationComponent(recallDays: string[]): number {
  if (recallDays.length === 0) return 0
  if (recallDays.length === 1) return 0.2
  const parsed = recallDays
    .map(d => Date.parse(d + "T00:00:00.000Z"))
    .filter(v => Number.isFinite(v))
    .sort((a, b) => a - b)
  if (parsed.length < 2) return 0.2
  const spanDays = (parsed[parsed.length - 1] - parsed[0]) / (24 * 60 * 60 * 1000)
  const spacing = clampScore(Math.log1p(parsed.length - 1) / Math.log1p(4))
  const span = clampScore(spanDays / 7)
  return clampScore(0.55 * spacing + 0.45 * span)
}

function calculateConceptualComponent(conceptTags: string[]): number {
  return clampScore(conceptTags.length / 6)
}

export interface PromotionScore {
  total: number
  components: {
    frequency: number
    relevance: number
    diversity: number
    recency: number
    consolidation: number
    conceptual: number
  }
}

export function calculatePromotionScore(
  entry: ShortTermRecallEntry,
  options: { nowMs: number; halfLifeDays: number; weights?: PromotionWeights },
): PromotionScore {
  const weights = options.weights ?? DEFAULT_PROMOTION_WEIGHTS

  const frequency = calculateFrequencyComponent(entry.recallCount)
  const avgScore = entry.recallCount > 0 ? entry.totalScore / entry.recallCount : 0
  const relevance = calculateRelevanceComponent(avgScore)
  const diversity = calculateDiversityComponent(entry.queryHashes.length, entry.recallDays)

  const lastRecalledMs = Date.parse(entry.lastRecalledAt)
  const ageDays = Number.isFinite(lastRecalledMs)
    ? Math.max(0, (options.nowMs - lastRecalledMs) / (24 * 60 * 60 * 1000))
    : 999
  const recency = calculateRecencyComponent(ageDays, options.halfLifeDays)
  const consolidation = calculateConsolidationComponent(entry.recallDays)
  const conceptual = calculateConceptualComponent(entry.conceptTags)

  const total =
    weights.frequency * frequency +
    weights.relevance * relevance +
    weights.diversity * diversity +
    weights.recency * recency +
    weights.consolidation * consolidation +
    weights.conceptual * conceptual

  return {
    total: clampScore(total),
    components: { frequency, relevance, diversity, recency, consolidation, conceptual },
  }
}

export interface DreamingConfig {
  enabled: boolean
  frequency: string
  lightLimit: number
  remLimit: number
  deepLimit: number
  minPromotionScore: number
  minRecallCount: number
  dedupeSimilarity: number
  halfLifeDays: number
}

export const DEFAULT_DREAMING_CONFIG: DreamingConfig = {
  enabled: true,
  frequency: "0 3 * * *",
  lightLimit: 20,
  remLimit: 10,
  deepLimit: 5,
  minPromotionScore: 0.75,
  minRecallCount: 3,
  dedupeSimilarity: 0.85,
  halfLifeDays: 30,
}

export interface DreamingPhaseResult {
  staged: ShortTermRecallEntry[]
  themes: string[]
  candidateTruths: Array<{ key: string; snippet: string; confidence: number }>
  promoted: Array<{ key: string; snippet: string; score: number }>
  wroteToLongTerm: boolean
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
    .filter(e => !("promotedAt" in e && e.promotedAt))
    .map(e => ({
      key: e.key,
      snippet: e.snippet || "(no snippet)",
      confidence: clampScore(
        (e.recallCount / 10) * 0.45 +
        (e.recallDays.length / 3) * 0.3 +
        (e.conceptTags.length / 6) * 0.25,
      ),
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
}

export function createMemoryManager(): MemoryManager {
  const store = new Map<string, MemoryEntry>()

  return {
    add(entry: MemoryEntry) {
      store.set(entry.id, entry)
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
