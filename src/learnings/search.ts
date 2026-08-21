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

interface IndexedMemory {
  id: string
  content: string
  contentTokens: string[]
  allTokens: string[]
  contentSet: Set<string>
  allTokensSet: Set<string>
  contentBoost: number
}

export type MemorySearchEngine = ReturnType<typeof createMemorySearchEngine>

export function createMemorySearchEngine() {
  const index = new Map<string, IndexedMemory>()

  return {
    index(entries: SearchableMemory[]) {
      for (const entry of entries) {
        const contentTokens = tokenize(entry.content)
        const lowerTags = entry.tags.map(t => t.toLowerCase())
        const allTokens = [...contentTokens, ...lowerTags]
        index.set(entry.id, {
          id: entry.id,
          content: entry.content,
          contentTokens,
          allTokens,
          contentSet: new Set(contentTokens),
          allTokensSet: new Set(allTokens),
          contentBoost: Math.min(1, entry.content.length / 100),
        })
      }
    },

    search(query: string, options: SearchOptions = {}): SearchResult[] {
      const { limit = 10, useTags = false } = options
      const queryTokens = tokenize(query)
      const queryLen = queryTokens.length
      const results: SearchResult[] = []

      // Pre-tokenized searching to avoid O(N * Q) string re-processing
      for (const entry of index.values()) {
        let matches = 0
        if (queryLen > 0) {
          const tokens = useTags ? entry.allTokens : entry.contentTokens
          const tokenSet = useTags ? entry.allTokensSet : entry.contentSet
          const tokenLen = tokens.length

          for (let i = 0; i < queryLen; i++) {
            const qt = queryTokens[i]
            // O(1) set lookup for exact token match
            if (tokenSet.has(qt)) {
              matches++
              continue
            }
            // Substring inclusion fallback for partial token matches
            for (let j = 0; j < tokenLen; j++) {
              const ct = tokens[j]
              if (ct.includes(qt) || qt.includes(ct)) {
                matches++
                break
              }
            }
          }
        }

        const matchRatio = queryLen > 0 ? matches / queryLen : 0
        const score = matchRatio * 0.8 + entry.contentBoost * 0.2

        if (score > 0.1) {
          results.push({ id: entry.id, content: entry.content, score })
        }
      }

      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
    },

    getIndexSize(): number {
      return index.size
    },
  }
}
