import { mkdirSync, writeFileSync, existsSync } from "fs"
import { join } from "path"
import type { RepoConfig, PipelineState } from "./types"
import { cloneRepo } from "./clone"
import { instrument } from "./instrument"
import { extractData } from "./extract"
import { audit, assessValue } from "./analyze"
import { findPatterns } from "./patterns"
import { generateMetaLearnings } from "./meta"
import { generateRLSignals } from "./rl"
import { generateSpec, formatPlan } from "./generator"
import { runCognitiveAssessment, DEFAULT_COGNITIVE_CONFIG } from "./cognitive"
import type { CognitiveAssessment, CognitiveConfig } from "./cognitive"

export interface PipelineCallbacks {
  onStep?: (step: string, state: Partial<PipelineState>) => void
  onError?: (step: string, error: Error) => void
}

export function createPipeline(callbacks?: PipelineCallbacks, cognitiveConfig?: CognitiveConfig) {
  const state: PipelineState = {
    repo: null,
    clone: null,
    instrument: null,
    extract: null,
    audit: [],
    value: null,
    patterns: [],
    meta: [],
    rl: [],
    plan: null,
    startTime: Date.now(),
    endTime: null,
    errors: [],
  }

  let cognitiveAssessment: CognitiveAssessment | null = null

  function notify(step: string) {
    callbacks?.onStep?.(step, { ...state })
  }

  function recordError(step: string, error: Error) {
    state.errors.push(`${step}: ${error.message}`)
    callbacks?.onError?.(step, error)
  }

  return {
    getState: () => ({ ...state }),
    getCognitiveAssessment: () => cognitiveAssessment,

    async run(config: RepoConfig, workDir: string): Promise<PipelineState> {
      state.repo = config
      state.startTime = Date.now()

      // Step 1: Clone
      notify("clone")
      try {
        state.clone = await cloneRepo(config, workDir)
      } catch (e) {
        recordError("clone", e as Error)
        state.endTime = Date.now()
        return state
      }

      // Step 2: Instrument
      notify("instrument")
      try {
        state.instrument = instrument(state.clone.path, { timeout: config.timeout })
      } catch (e) {
        recordError("instrument", e as Error)
      }

      // Step 3: Extract (single-pass optimized)
      notify("extract")
      try {
        state.extract = extractData(state.clone.path)
      } catch (e) {
        recordError("extract", e as Error)
      }

      // Step 4: Audit
      notify("audit")
      try {
        if (state.extract) {
          state.audit = audit(state.extract)
        }
      } catch (e) {
        recordError("audit", e as Error)
      }

      // Step 5: Value assessment
      notify("value")
      try {
        if (state.extract) {
          state.value = assessValue(state.extract, state.audit)
        }
      } catch (e) {
        recordError("value", e as Error)
      }

      // Step 6: Patterns
      notify("patterns")
      try {
        if (state.extract) {
          const patternInsights = findPatterns(state.extract)
          state.patterns = patternInsights.map(pi => pi.pattern)
        }
      } catch (e) {
        recordError("patterns", e as Error)
      }

      // Step 7: Meta learnings
      notify("meta")
      try {
        if (state.extract && state.value) {
          state.meta = generateMetaLearnings(state.extract, state.audit, state.value)
        }
      } catch (e) {
        recordError("meta", e as Error)
      }

      // Step 8: RL signals
      notify("rl")
      try {
        if (state.extract && state.value) {
          state.rl = generateRLSignals(state.extract, state.audit, state.value)
        }
      } catch (e) {
        recordError("rl", e as Error)
      }

      // Step 9: Generate spec
      notify("generate")
      try {
        if (state.value) {
          state.plan = generateSpec(state.audit, state.value, state.meta, state.rl)
        }
      } catch (e) {
        recordError("generate", e as Error)
      }

      // Step 10: Cognitive assessment (NEW)
      notify("cognitive")
      try {
        if (state.extract) {
          cognitiveAssessment = runCognitiveAssessment(
            state.extract,
            state.audit,
            state.rl,
            state.meta,
            cognitiveConfig || DEFAULT_COGNITIVE_CONFIG,
          )
        }
      } catch (e) {
        recordError("cognitive", e as Error)
      }

      state.endTime = Date.now()
      notify("complete")
      return state
    },

    saveReport(state: PipelineState, outputDir: string): string {
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
      }

      const report = buildReport(state, cognitiveAssessment)
      const reportPath = join(outputDir, `learnings-report-${Date.now()}.md`)
      writeFileSync(reportPath, report)

      if (state.plan) {
        const planPath = join(outputDir, `spec-plan-${Date.now()}.md`)
        writeFileSync(planPath, formatPlan(state.plan))
      }

      // Save raw data including cognitive assessment
      const dataPath = join(outputDir, `pipeline-data-${Date.now()}.json`)
      writeFileSync(dataPath, JSON.stringify({ ...state, cognitiveAssessment }, null, 2))

      return reportPath
    },
  }
}

function buildReport(state: PipelineState, cognitive?: CognitiveAssessment | null): string {
  const lines: string[] = []
  const duration = ((state.endTime || Date.now()) - state.startTime) / 1000

  lines.push("# Learnings Report")
  lines.push("")
  lines.push(`**Generated:** ${new Date().toISOString()}`)
  lines.push(`**Duration:** ${duration.toFixed(1)}s`)
  lines.push(`**Repo:** ${state.repo?.url || "N/A"}`)
  lines.push("")

  if (state.clone) {
    lines.push("## Clone Summary")
    lines.push("")
    lines.push(`- **Branch:** ${state.clone.branch}`)
    lines.push(`- **Commit:** ${state.clone.commitHash} — ${state.clone.commitMessage}`)
    lines.push(`- **Files:** ${state.clone.fileCount}`)
    lines.push(`- **Languages:** ${Object.entries(state.clone.languages).map(([k, v]) => `${k} (${v})`).join(", ")}`)
    lines.push(`- **Package manager:** ${state.clone.packageManager || "none"}`)
    lines.push(`- **Has tests:** ${state.clone.hasTests}`)
    lines.push(`- **Has CI:** ${state.clone.hasCI}`)
    lines.push(`- **Setup time:** ${(state.clone.setupDuration / 1000).toFixed(1)}s`)
    lines.push("")
  }

  if (state.instrument) {
    lines.push("## Metrics")
    lines.push("")
    const m = state.instrument.metrics
    lines.push(`| Metric | Value |`)
    lines.push(`|--------|-------|`)
    lines.push(`| Build time | ${m.buildTime || "N/A"}ms |`)
    lines.push(`| Files | ${m.fileCount} |`)
    lines.push(`| Total LOC | ${m.totalLOC} |`)
    lines.push(`| Avg file length | ${m.avgFileLength} lines |`)
    lines.push(`| Max file length | ${m.maxFileLength} lines |`)
    lines.push(`| Dependencies | ${m.dependencyCount} direct, ${m.devDependencyCount} dev |`)
    lines.push(`| Exports | ${m.exportedSymbols} |`)
    lines.push(`| Imports | ${m.importedSymbols} |`)
    lines.push(`| Circular deps | ${m.circularDeps.length} |`)
    lines.push(`| Lint errors | ${m.lintErrors} |`)
    lines.push(`| Type errors | ${m.typeErrors} |`)
    lines.push("")
  }

  if (state.audit.length > 0) {
    lines.push("## Audit Findings")
    lines.push("")
    const bySev = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }
    for (const f of state.audit) bySev[f.severity]++
    lines.push(`**${state.audit.length} findings:** ${bySev.critical} critical, ${bySev.high} high, ${bySev.medium} medium, ${bySev.low} low, ${bySev.info} info`)
    lines.push("")
    for (const f of state.audit) {
      lines.push(`### [${f.severity.toUpperCase()}] ${f.title}`)
      lines.push("")
      lines.push(f.description)
      lines.push("")
      if (f.evidence.length > 0) {
        lines.push("**Evidence:**")
        for (const e of f.evidence.slice(0, 5)) lines.push(`- ${e}`)
        lines.push("")
      }
      lines.push(`**Recommendation:** ${f.recommendation}`)
      lines.push(`**Effort:** ${f.effort} | **Impact:** ${f.impact}`)
      lines.push("")
    }
  }

  if (state.value) {
    lines.push("## Value Assessment")
    lines.push("")
    lines.push(`**Overall score:** ${state.value.overallScore}/100`)
    lines.push("")
    lines.push("**Dimensions:**")
    for (const [dim, score] of Object.entries(state.value.dimensions)) {
      lines.push(`- ${dim}: ${score}/10`)
    }
    lines.push("")
    if (state.value.strengths.length > 0) {
      lines.push("**Strengths:**")
      for (const s of state.value.strengths) lines.push(`- ${s}`)
      lines.push("")
    }
    if (state.value.weaknesses.length > 0) {
      lines.push("**Weaknesses:**")
      for (const w of state.value.weaknesses) lines.push(`- ${w}`)
      lines.push("")
    }
    lines.push(`**Estimated development hours:** ${state.value.roiEstimate.developmentHours}h`)
    lines.push("")
  }

  if (state.meta.length > 0) {
    lines.push("## Meta Learnings")
    lines.push("")
    for (const m of state.meta) {
      lines.push(`### [${m.category}] ${m.insight}`)
      lines.push("")
      lines.push(`**Confidence:** ${(m.confidence * 100).toFixed(0)}%`)
      lines.push(`**Applicable to:** ${m.applicableTo.join(", ")}`)
      if (m.evidence.length > 0) {
        lines.push("**Evidence:**")
        for (const e of m.evidence.slice(0, 3)) lines.push(`- ${e}`)
      }
      lines.push("")
    }
  }

  if (state.rl.length > 0) {
    lines.push("## RL Signals")
    lines.push("")
    lines.push("| Action | Reward | Context | Outcome |")
    lines.push("|--------|--------|---------|---------|")
    for (const s of state.rl) {
      lines.push(`| ${s.action} | ${s.reward > 0 ? "+" : ""}${s.reward.toFixed(2)} | ${s.context} | ${s.outcome} |`)
    }
    lines.push("")
    const totalReward = state.rl.reduce((sum, s) => sum + s.reward, 0)
    lines.push(`**Aggregate reward:** ${totalReward > 0 ? "+" : ""}${totalReward.toFixed(2)}`)
    lines.push("")
  }

  if (state.plan) {
    lines.push("## Spec Plan")
    lines.push("")
    lines.push(`**${state.plan.slices.length} slices, ${state.plan.estimatedEffort}h estimated**`)
    lines.push("")
    for (const slice of state.plan.slices) {
      lines.push(`### ${slice.title} (${slice.risk} risk)`)
      lines.push("")
      for (const task of slice.tasks) {
        lines.push(`- [ ] ${task.description} (${task.estimatedMinutes}min, ${task.type})`)
      }
      lines.push("")
    }
  }

  if (state.errors.length > 0) {
    lines.push("## Errors")
    lines.push("")
    for (const e of state.errors) lines.push(`- ${e}`)
    lines.push("")
  }

  if (cognitive) {
    lines.push("## Cognitive Assessment")
    lines.push("")
    lines.push(`**Maturity:** ${cognitive.maturity.tier} (${(cognitive.maturity.score * 100).toFixed(0)}%)`)
    lines.push("**Factors:**")
    for (const f of cognitive.maturity.factors) lines.push(`- ${f}`)
    lines.push("")

    lines.push("### Adaptive Thresholds")
    lines.push(`- God file: ${cognitive.adaptiveThresholds.godFileLines} lines`)
    lines.push(`- Max nesting: ${cognitive.adaptiveThresholds.maxNesting}`)
    lines.push(`- Min test/source ratio: ${(cognitive.adaptiveThresholds.testToSourceMin * 100).toFixed(0)}%`)
    lines.push(`- Min doc coverage: ${(cognitive.adaptiveThresholds.docCoverageMin * 100).toFixed(0)}%`)
    lines.push("")

    if (cognitive.ensemble.confirmed.length > 0) {
      lines.push("### Ensemble Confirmed Findings")
      for (const f of cognitive.ensemble.confirmed) {
        lines.push(`- **[${f.severity.toUpperCase()}]** ${f.finding} (confidence: ${(f.confidence * 100).toFixed(0)}%)`)
      }
      lines.push("")
    }

    if (cognitive.difficultyMap.length > 0) {
      lines.push("### Difficulty Stratification")
      for (const d of cognitive.difficultyMap) {
        lines.push(`- **${d.area}** (${(d.difficulty * 100).toFixed(0)}%): ${d.reason}`)
      }
      lines.push("")
    }

    if (cognitive.reflections.length > 0) {
      lines.push("### Reflections")
      for (const r of cognitive.reflections) {
        lines.push(`- **${r.aspect}:** ${r.insight}`)
        lines.push(`  Action: ${r.action}`)
      }
      lines.push("")
    }
  }

  return lines.join("\n")
}
