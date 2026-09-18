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

interface IndexedEntry {
  memory: SearchableMemory
  contentTokens: string[]
  contentTokenSet: Set<string>
  tagTokens: string[]
  tagTokenSet: Set<string>
  lengthBoost: number
}

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter(t => t.length > 2)
}

export function createMemorySearchEngine() {
  const index = new Map<string, IndexedEntry>()

  return {
    index(entries: SearchableMemory[]) {
      for (const entry of entries) {
        // Bolt Optimization: Pre-tokenize content and tags during indexing and store token Sets
        // to avoid repeated regex splitting, string allocations, and O(N) linear scans on every search call.
        const contentTokens = tokenize(entry.content)
        const tagTokens = entry.tags.map(t => t.toLowerCase())
        const lengthBoost = Math.min(1, entry.content.length / 100)

        index.set(entry.id, {
          memory: entry,
          contentTokens,
          contentTokenSet: new Set(contentTokens),
          tagTokens,
          tagTokenSet: new Set(tagTokens),
          lengthBoost,
        })
      }
    },

    search(query: string, options: SearchOptions = {}): SearchResult[] {
      const { limit = 10, useTags = false } = options

      // Bolt Optimization: Tokenize query string once per search call
      const queryTokens = tokenize(query)
      const qLen = queryTokens.length
      if (qLen === 0) return []

      const results: SearchResult[] = []

      for (const [id, entry] of index) {
        let matches = 0

        for (let i = 0; i < qLen; i++) {
          const qt = queryTokens[i]

          // Bolt Optimization: Fast path O(1) set lookup for exact token matches before falling back to substring checks
          if (entry.contentTokenSet.has(qt) || (useTags && entry.tagTokenSet.has(qt))) {
            matches++
            continue
          }

          // Fallback to substring matching if exact match not found
          const allContent = useTags ? [...entry.contentTokens, ...entry.tagTokens] : entry.contentTokens
          for (let j = 0; j < allContent.length; j++) {
            const ct = allContent[j]
            if (ct.includes(qt) || qt.includes(ct)) {
              matches++
              break
            }
          }
        }

        const matchRatio = matches / qLen
        const score = matchRatio * 0.8 + entry.lengthBoost * 0.2

        if (score > 0.1) {
          results.push({ id, content: entry.memory.content, score })
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
