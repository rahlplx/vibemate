import type { AuditFinding, ValueAssessment, MetaLearning, RLSignal, SpecPlan, PlanSlice, PlanTask } from "./types"

function effortToMinutes(effort: string): number {
  const map: Record<string, number> = { trivial: 15, easy: 60, medium: 240, hard: 480, epic: 1440 }
  return map[effort] || 120
}

function severityToPriority(sev: string): number {
  const map: Record<string, number> = { critical: 10, high: 7, medium: 4, low: 2, info: 1 }
  return map[sev] || 5
}

function findingToTasks(finding: AuditFinding): PlanTask[] {
  const tasks: PlanTask[] = []

  tasks.push({
    id: `${finding.id}-plan`,
    description: `Plan fix for: ${finding.title}`,
    type: "tdd",
    estimatedMinutes: 30,
    dependencies: [],
    acceptanceCriteria: [
      `Understanding of ${finding.title} impact documented`,
      `Fix approach defined and reviewed`,
    ],
  })

  tasks.push({
    id: `${finding.id}-test`,
    description: `Write tests for: ${finding.title}`,
    type: "tdd",
    estimatedMinutes: effortToMinutes(finding.effort) * 0.4,
    dependencies: [`${finding.id}-plan`],
    acceptanceCriteria: [
      "Failing test written first",
      "Test covers the specific issue",
      "Test passes after fix",
    ],
  })

  tasks.push({
    id: `${finding.id}-fix`,
    description: `Implement fix for: ${finding.title}`,
    type: "implement",
    estimatedMinutes: effortToMinutes(finding.effort) * 0.4,
    dependencies: [`${finding.id}-test`],
    acceptanceCriteria: [
      "Fix implemented",
      "All tests pass",
      "No regressions",
    ],
  })

  tasks.push({
    id: `${finding.id}-verify`,
    description: `Verify fix for: ${finding.title}`,
    type: "test",
    estimatedMinutes: effortToMinutes(finding.effort) * 0.2,
    dependencies: [`${finding.id}-fix`],
    acceptanceCriteria: [
      "Original issue resolved",
      "No new issues introduced",
    ],
  })

  return tasks
}

export function generateSpec(
  findings: AuditFinding[],
  value: ValueAssessment,
  meta: MetaLearning[],
  rl: RLSignal[],
): SpecPlan {
  // Sort findings by severity then impact
  const sorted = [...findings].sort((a, b) => {
    const sevDiff = severityToPriority(b.severity) - severityToPriority(a.severity)
    if (sevDiff !== 0) return sevDiff
    const impactMap: Record<string, number> = { high: 3, medium: 2, low: 1 }
    return (impactMap[b.impact] || 0) - (impactMap[a.impact] || 0)
  })

  // Group findings into slices by category
  const categoryGroups = new Map<string, AuditFinding[]>()
  for (const f of sorted) {
    const existing = categoryGroups.get(f.category) || []
    existing.push(f)
    categoryGroups.set(f.category, existing)
  }

  const slices: PlanSlice[] = []
  let sliceIndex = 0

  for (const [category, catFindings] of categoryGroups) {
    const tasks = catFindings.flatMap(f => findingToTasks(f))
    const totalMinutes = tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0)

    slices.push({
      id: `slice-${sliceIndex++}`,
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} improvements`,
      description: `Address ${catFindings.length} findings in ${category}`,
      tasks,
      estimatedHours: Math.round(totalMinutes / 60 * 10) / 10,
      risk: catFindings.some(f => f.severity === "critical") ? "high" :
        catFindings.some(f => f.severity === "high") ? "medium" : "low",
    })
  }

  // Add meta-learning inspired slice
  const metaTasks: PlanTask[] = meta.slice(0, 5).map((m, i) => ({
    id: `meta-${i}`,
    description: `Apply meta-learning: ${m.insight}`,
    type: "tdd" as const,
    estimatedMinutes: 60,
    dependencies: [],
    acceptanceCriteria: [
      `Insight documented: ${m.insight}`,
      `Applied to: ${m.applicableTo.join(", ")}`,
    ],
  }))

  if (metaTasks.length > 0) {
    slices.push({
      id: "slice-meta",
      title: "Meta-learning applications",
      description: "Apply key learnings from codebase analysis",
      tasks: metaTasks,
      estimatedHours: Math.round(metaTasks.reduce((s, t) => s + t.estimatedMinutes, 0) / 60 * 10) / 10,
      risk: "low",
    })
  }

  const totalHours = slices.reduce((sum, s) => sum + s.estimatedHours, 0)
  const totalTasks = slices.reduce((sum, s) => sum + s.tasks.length, 0)

  return {
    id: `spec-${Date.now()}`,
    title: `Quality improvement plan: ${value.overallScore}/100 overall`,
    description: `Generated from ${findings.length} audit findings, ${meta.length} meta-learnings, ${rl.length} RL signals. Total: ${totalTasks} tasks across ${slices.length} slices, estimated ${totalHours} hours.`,
    slices,
    estimatedEffort: totalHours,
    priority: findings.some(f => f.severity === "critical") ? 10 : findings.some(f => f.severity === "high") ? 7 : 4,
    dependencies: [],
  }
}

export function formatPlan(plan: SpecPlan): string {
  const lines: string[] = []
  lines.push(`# ${plan.title}`)
  lines.push("")
  lines.push(plan.description)
  lines.push("")
  lines.push(`**Estimated effort:** ${plan.estimatedEffort} hours`)
  lines.push(`**Priority:** ${plan.priority}/10`)
  lines.push("")
  lines.push("---")
  lines.push("")

  for (const slice of plan.slices) {
    lines.push(`## ${slice.title}`)
    lines.push("")
    lines.push(`Risk: ${slice.risk} | Tasks: ${slice.tasks.length} | Hours: ${slice.estimatedHours}`)
    lines.push("")
    lines.push("| Task | Type | Minutes | Dependencies |")
    lines.push("|------|------|---------|--------------|")
    for (const task of slice.tasks) {
      lines.push(`| ${task.description} | ${task.type} | ${task.estimatedMinutes} | ${task.dependencies.length || "none"} |`)
    }
    lines.push("")
    for (const task of slice.tasks) {
      lines.push(`### ${task.id}`)
      for (const ac of task.acceptanceCriteria) {
        lines.push(`- [ ] ${ac}`)
      }
      lines.push("")
    }
  }

  return lines.join("\n")
}
