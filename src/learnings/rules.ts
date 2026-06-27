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
      if (!proposal || proposal.status !== "pending") return false

      proposal.status = "approved"
      proposal.resolvedAt = new Date().toISOString()
      rules.set(proposal.key, { ...proposal })
      proposals.delete(id)
      return true
    },

    reject(id: string): boolean {
      const proposal = proposals.get(id)
      if (!proposal || proposal.status !== "pending") return false

      proposal.status = "rejected"
      proposal.resolvedAt = new Date().toISOString()
      proposals.delete(id)
      return true
    },

    getRules(): RuleChange[] {
      return [...rules.values()]
    },

    getPending(): RuleChange[] {
      return [...proposals.values()].filter(p => p.status === "pending")
    },

    getHistory(): RuleChange[] {
      const all = [...rules.values(), ...proposals.values()]
      return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    },

    getSummary() {
      const all = this.getHistory()
      return {
        total: all.length,
        pending: all.filter(r => r.status === "pending").length,
        approved: all.filter(r => r.status === "approved").length,
        rejected: all.filter(r => r.status === "rejected").length,
      }
    },
  }
}
