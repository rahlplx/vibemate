import {
  createMemoryEntry,
  computeMemoryStrength,
  shouldReview,
  updateMemory,
  calculateTemporalDecay,
  MemoryEntry,
  ShortTermRecallEntry,
  calculatePromotionScore,
} from "../learnings/dreaming"

export interface WorkflowEvidence {
  workflow: string
  successRate: number
  avgDuration: number
  totalRuns: number
  lastRun: string
  tags: string[]
}

export interface SkillEffectiveness {
  skill: string
  score: number
  uses: number
  lastUsed: string
  evidence: string[]
}

export interface MemoryHealth {
  totalEntries: number
  byLayer: Record<string, number>
  avgStrength: number
  staleCount: number
  promotionCandidates: number
}

export interface ToolIssue {
  tool: string
  issue: string
  frequency: number
  lastSeen: string
  workaround: string
}

const WORKFLOW_EVIDENCE: WorkflowEvidence[] = [
  { workflow: "tdd", successRate: 1.0, avgDuration: 120, totalRuns: 89, lastRun: "2026-06-27T18:00:00Z", tags: ["reliability", "quality"] },
  { workflow: "reference-repo-analysis", successRate: 0.95, avgDuration: 300, totalRuns: 4, lastRun: "2026-06-27T16:00:00Z", tags: ["research", "patterns"] },
  { workflow: "parallel-subagent", successRate: 0.9, avgDuration: 60, totalRuns: 12, lastRun: "2026-06-27T17:00:00Z", tags: ["speed", "parallel"] },
  { workflow: "simulation-loop", successRate: 1.0, avgDuration: 30, totalRuns: 3, lastRun: "2026-06-27T18:00:00Z", tags: ["validation", "robustness"] },
  { workflow: "gap-analysis", successRate: 0.85, avgDuration: 600, totalRuns: 2, lastRun: "2026-06-27T14:00:00Z", tags: ["planning", "strategy"] },
]

const SKILL_EFFECTIVENESS: SkillEffectiveness[] = [
  { skill: "tdd", score: 10, uses: 89, lastUsed: "2026-06-27T18:00:00Z", evidence: ["889 tests pass", "0 failures", "RED-GREEN-REFACTOR consistently applied"] },
  { skill: "explore", score: 9, uses: 12, lastUsed: "2026-06-27T17:00:00Z", evidence: ["3-repo parallel analysis", "pattern extraction"] },
  { skill: "vibe-plan", score: 8, uses: 3, lastUsed: "2026-06-27T14:00:00Z", evidence: ["12 gaps identified", "prioritized by severity"] },
  { skill: "vibe-retro", score: 8, uses: 2, lastUsed: "2026-06-27T18:00:00Z", evidence: ["evidence-based improvement", "action items tracked"] },
  { skill: "skill-creator", score: 7, uses: 1, lastUsed: "2026-06-27T12:00:00Z", evidence: ["9 agent skills created", "consistent structure"] },
  { skill: "vibe-build", score: 7, uses: 8, lastUsed: "2026-06-27T17:00:00Z", evidence: ["RED-GREEN-REFACTOR loop", "fresh subagent per task"] },
  { skill: "diagnose", score: 6, uses: 3, lastUsed: "2026-06-27T11:00:00Z", evidence: ["file lock debugging", "regex flag issues"] },
]

const TOOL_ISSUES: ToolIssue[] = [
  { tool: "bun test", issue: "Ignores .bunignore", frequency: 5, lastSeen: "2026-06-27T15:00:00Z", workaround: "Move repos outside project root" },
  { tool: "bun -e", issue: "Template literals fail on Windows", frequency: 3, lastSeen: "2026-06-27T18:00:00Z", workaround: "Write to .ts file" },
  { tool: "git push", issue: "No upstream on new branches", frequency: 2, lastSeen: "2026-06-27T16:00:00Z", workaround: "Use --set-upstream" },
  { tool: "better-sqlite3", issue: "Requires VS Build Tools", frequency: 1, lastSeen: "2026-06-27T10:00:00Z", workaround: "Use bun:sqlite" },
  { tool: "regex g flag", issue: "lastIndex persists across calls", frequency: 4, lastSeen: "2026-06-27T17:00:00Z", workaround: "new RegExp() per call" },
]

export function buildShortTermRecalls(): ShortTermRecallEntry[] {
  const entries: ShortTermRecallEntry[] = []

  for (const wf of WORKFLOW_EVIDENCE) {
    entries.push({
      key: `workflow:${wf.workflow}`,
      path: "docs/retro-2026-06-27.md",
      startLine: 1,
      endLine: 5,
      source: "retro",
      snippet: `${wf.workflow}: ${(wf.successRate * 100).toFixed(0)}% success, ${wf.totalRuns} runs`,
      recallCount: wf.totalRuns,
      dailyCount: Math.min(wf.totalRuns, 7),
      groundedCount: wf.tags.length,
      totalScore: wf.successRate * wf.totalRuns,
      maxScore: wf.successRate,
      firstRecalledAt: "2026-06-27T10:00:00Z",
      lastRecalledAt: wf.lastRun,
      queryHashes: wf.tags,
      recallDays: ["2026-06-27"],
      conceptTags: wf.tags,
    })
  }

  for (const sk of SKILL_EFFECTIVENESS) {
    entries.push({
      key: `skill:${sk.skill}`,
      path: "docs/retro-2026-06-27.md",
      startLine: 10,
      endLine: 15,
      source: "retro",
      snippet: `skill ${sk.skill}: score ${sk.score}/10, ${sk.uses} uses`,
      recallCount: sk.uses,
      dailyCount: Math.min(sk.uses, 7),
      groundedCount: sk.evidence.length,
      totalScore: sk.score * sk.uses,
      maxScore: sk.score / 10,
      firstRecalledAt: "2026-06-27T10:00:00Z",
      lastRecalledAt: sk.lastUsed,
      queryHashes: sk.evidence.slice(0, 3),
      recallDays: ["2026-06-27"],
      conceptTags: [sk.skill, "effectiveness"],
    })
  }

  for (const ti of TOOL_ISSUES) {
    entries.push({
      key: `tool-issue:${ti.tool}`,
      path: "docs/retro-2026-06-27.md",
      startLine: 20,
      endLine: 25,
      source: "retro",
      snippet: `${ti.tool}: ${ti.issue} (${ti.frequency}x)`,
      recallCount: ti.frequency,
      dailyCount: Math.min(ti.frequency, 7),
      groundedCount: 1,
      totalScore: ti.frequency * 0.5,
      maxScore: 0.5,
      firstRecalledAt: "2026-06-27T10:00:00Z",
      lastRecalledAt: ti.lastSeen,
      queryHashes: [ti.workaround],
      recallDays: ["2026-06-27"],
      conceptTags: [ti.tool, "issue", "workaround"],
    })
  }

  return entries
}

export function getWorkflowEvidence(): WorkflowEvidence[] {
  return WORKFLOW_EVIDENCE
}

export function getSkillEffectiveness(): SkillEffectiveness[] {
  return SKILL_EFFECTIVENESS
}

export function getToolIssues(): ToolIssue[] {
  return TOOL_ISSUES
}

export function assessMemoryHealth(entries: ShortTermRecallEntry[]): MemoryHealth {
  const nowMs = Date.now()
  let totalStrength = 0
  let staleCount = 0
  let promotionCandidates = 0

  for (const entry of entries) {
    const ageDays = (nowMs - Date.parse(entry.lastRecalledAt)) / (24 * 60 * 60 * 1000)
    const decay = calculateTemporalDecay(ageDays, 30)
    totalStrength += decay
    if (decay < 0.3) staleCount++
    if (decay > 0.7 && entry.recallCount >= 3) promotionCandidates++
  }

  return {
    totalEntries: entries.length,
    byLayer: { working: 0, episodic: 0, semantic: 0, dreams: 0 },
    avgStrength: entries.length > 0 ? totalStrength / entries.length : 0,
    staleCount,
    promotionCandidates,
  }
}

export function getTopWorkflows(n: number): WorkflowEvidence[] {
  return [...WORKFLOW_EVIDENCE]
    .sort((a, b) => b.successRate * b.totalRuns - a.successRate * a.totalRuns)
    .slice(0, n)
}

export function getTopSkills(n: number): SkillEffectiveness[] {
  return [...SKILL_EFFECTIVENESS]
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
}

export function getFrequentToolIssues(n: number): ToolIssue[] {
  return [...TOOL_ISSUES]
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, n)
}
