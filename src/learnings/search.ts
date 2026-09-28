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
  tags: string[]
  contentTokens: string[]
  allTokensWithTags: string[]
  tokenSetContent: Set<string>
  tokenSetWithTags: Set<string>
  contentBoost: number
}

export function createMemorySearchEngine() {
  const index = new Map<string, IndexedMemory>()

  return {
    index(entries: SearchableMemory[]) {
      for (const entry of entries) {
        const contentTokens = tokenize(entry.content)
        const lowerTags = entry.tags.map(t => t.toLowerCase())
        const allTokensWithTags = contentTokens.concat(lowerTags)
        const contentBoost = Math.min(1, entry.content.length / 100)

        index.set(entry.id, {
          id: entry.id,
          content: entry.content,
          tags: entry.tags,
          contentTokens,
          allTokensWithTags,
          tokenSetContent: new Set(contentTokens),
          tokenSetWithTags: new Set(allTokensWithTags),
          contentBoost,
        })
      }
    },

    search(query: string, options: SearchOptions = {}): SearchResult[] {
      const { limit = 10, useTags = false } = options
      const queryTokens = tokenize(query)
      const qLen = queryTokens.length
      const results: SearchResult[] = []

      // Performance Optimization: Tokenize query once, reuse pre-tokenized memory entries
      // and perform O(1) Set lookups for exact token matches before fallback substring checking.
      for (const [, memory] of index) {
        const tokensToSearch = useTags ? memory.allTokensWithTags : memory.contentTokens
        const tokenSet = useTags ? memory.tokenSetWithTags : memory.tokenSetContent
        const tLen = tokensToSearch.length

        let matches = 0
        for (let i = 0; i < qLen; i++) {
          const qt = queryTokens[i]
          if (tokenSet.has(qt)) {
            matches++
            continue
          }
          const qLenChar = qt.length
          for (let j = 0; j < tLen; j++) {
            const ct = tokensToSearch[j]
            const cLenChar = ct.length
            if (cLenChar >= qLenChar ? ct.includes(qt) : qt.includes(ct)) {
              matches++
              break
            }
          }
        }

        const matchRatio = qLen > 0 ? matches / qLen : 0
        const score = matchRatio * 0.8 + memory.contentBoost * 0.2

        if (score > 0.1) {
          results.push({ id: memory.id, content: memory.content, score })
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
