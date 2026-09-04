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

interface IndexedMemory extends SearchableMemory {
  contentTokens: string[]
  allTokens: string[]
  contentBoost: number
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(t => t.length > 2)
}

export function createMemorySearchEngine() {
  const index = new Map<string, IndexedMemory>()

  return {
    index(entries: SearchableMemory[]) {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const contentTokens = tokenize(entry.content)
        const tagTokens = entry.tags.map(t => t.toLowerCase())
        // Pre-combine content and tag tokens to avoid array allocations during search calls
        const allTokens = [...contentTokens, ...tagTokens]
        const contentBoost = Math.min(1, entry.content.length / 100) * 0.2

        index.set(entry.id, {
          ...entry,
          contentTokens,
          allTokens,
          contentBoost,
        })
      }
    },

    search(query: string, options: SearchOptions = {}): SearchResult[] {
      const { limit = 10, useTags = false } = options

      // Tokenize search query ONCE per search call instead of per document (O(1) vs O(N))
      const queryTokens = tokenize(query)
      if (queryTokens.length === 0) return []

      const results: SearchResult[] = []

      for (const memory of index.values()) {
        const tokens = useTags ? memory.allTokens : memory.contentTokens
        let matches = 0

        for (let q = 0; q < queryTokens.length; q++) {
          const qt = queryTokens[q]
          for (let c = 0; c < tokens.length; c++) {
            const ct = tokens[c]
            if (ct.includes(qt) || qt.includes(ct)) {
              matches++
              break
            }
          }
        }

        const matchRatio = matches / queryTokens.length
        const score = matchRatio * 0.8 + memory.contentBoost
        if (score > 0.1) {
          results.push({ id: memory.id, content: memory.content, score })
        }
      }

      // Map keys are already unique by id, no need for redundant deduplication Set filtering
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    },

    getIndexSize(): number {
      return index.size
    },
  }
}
