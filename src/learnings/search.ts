export interface SearchableMemory {
  id: string
  content: string
  tags: string[]
}

export interface SearchResult {
  id: string
  content: string
  score: number
}

export interface SearchOptions {
  limit?: number
  useTags?: boolean
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(t => t.length > 2)
}

function calculateScore(query: string, content: string, tags: string[], useTags: boolean): number {
  const queryTokens = tokenize(query)
  const contentTokens = tokenize(content)
  const allContent = useTags ? [...contentTokens, ...tags.map(t => t.toLowerCase())] : contentTokens

  let matches = 0
  for (const qt of queryTokens) {
    for (const ct of allContent) {
      if (ct.includes(qt) || qt.includes(ct)) {
        matches++
        break
      }
    }
  }

  const matchRatio = queryTokens.length > 0 ? matches / queryTokens.length : 0
  const contentBoost = Math.min(1, content.length / 100)
  return matchRatio * 0.8 + contentBoost * 0.2
}

export function createMemorySearchEngine() {
  const index = new Map<string, SearchableMemory>()

  return {
    index(entries: SearchableMemory[]) {
      for (const entry of entries) {
        index.set(entry.id, entry)
      }
    },

    search(query: string, options: SearchOptions = {}): SearchResult[] {
      const { limit = 10, useTags = false } = options
      const results: SearchResult[] = []

      for (const [id, memory] of index) {
        const score = calculateScore(query, memory.content, memory.tags, useTags)
        if (score > 0.1) {
          results.push({ id, content: memory.content, score })
        }
      }

      const seen = new Set<string>()
      return results
        .filter(r => {
          if (seen.has(r.id)) return false
          seen.add(r.id)
          return true
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    },

    getIndexSize(): number {
      return index.size
    },
  }
}
