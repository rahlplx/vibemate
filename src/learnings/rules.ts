export type RuleStatus = "pending" | "approved" | "rejected"

export interface RuleChange {
  id: string
  key: string
  score: number
  evidence: string[]
  status: RuleStatus
  createdAt: string
  resolvedAt?: string
}

export interface RuleProposal {
  id: string
  key: string
  score: number
  evidence: string[]
  status: RuleStatus
}

export interface RuleEngineOptions {
  minScore?: number
}

let ruleIdCounter = 0

export function createRuleEngine(options: RuleEngineOptions = {}) {
  const { minScore = 0 } = options
  const rules = new Map<string, RuleChange>()
  const proposals = new Map<string, RuleChange>()
  const rejectedProposals = new Map<string, RuleChange>()

  function generateId(): string {
    return `rule-${++ruleIdCounter}`
  }

  return {
    propose(evidence: Array<{ key: string; score: number; evidence: string[] }>): RuleProposal[] {
      const results: RuleProposal[] = []

      for (const item of evidence) {
        if (item.score < minScore) continue
        if (rules.has(item.key)) continue

        const id = generateId()
        const proposal: RuleChange = {
          id,
          key: item.key,
          score: item.score,
          evidence: item.evidence,
          status: "pending",
          createdAt: new Date().toISOString(),
        }

        proposals.set(id, proposal)
        results.push({ id, key: item.key, score: item.score, evidence: item.evidence, status: "pending" })
      }

      return results
    },

    approve(id: string): boolean {
      const proposal = proposals.get(id)
      if (!proposal) return false

      proposal.status = "approved"
      proposal.resolvedAt = new Date().toISOString()
      rules.set(proposal.key, { ...proposal })
      proposals.delete(id)
      return true
    },

    reject(id: string): boolean {
      const proposal = proposals.get(id)
      if (!proposal) return false

      proposal.status = "rejected"
      proposal.resolvedAt = new Date().toISOString()
      rejectedProposals.set(id, proposal)
      proposals.delete(id)
      return true
    },

    getRules(): RuleChange[] {
      return [...rules.values()]
    },

    // Fast-path: proposals Map only contains pending items, avoiding redundant .filter() calls
    getPending(): RuleChange[] {
      return [...proposals.values()]
    },

    // Optimized history: uses ISO 8601 string comparisons to avoid new Date() allocations during sorting
    getHistory(): RuleChange[] {
      const all: RuleChange[] = [
        ...rules.values(),
        ...proposals.values(),
        ...rejectedProposals.values(),
      ]
      return all.sort((a, b) => (b.createdAt > a.createdAt ? 1 : b.createdAt < a.createdAt ? -1 : 0))
    },

    // Fast-path O(1) summary using Map sizes instead of full history sorting and multi-pass filtering
    getSummary() {
      const pending = proposals.size
      const approved = rules.size
      const rejected = rejectedProposals.size
      return {
        total: pending + approved + rejected,
        pending,
        approved,
        rejected,
      }
    },
  }
}
