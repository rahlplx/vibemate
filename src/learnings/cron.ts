export type DreamingPhase = "light" | "rem" | "deep"

export interface PhaseResult {
  phase: DreamingPhase
  durationMs: number
  success: boolean
  error?: string
}

export interface RunResult {
  completed: boolean
  skipped: boolean
  phases: PhaseResult[]
  startedAt: Date
  completedAt?: Date
}

export interface DreamingJobStatus {
  enabled: boolean
  totalRuns: number
  lastRun?: RunResult
  nextRun?: Date
  history: RunResult[]
}

export interface DreamingSchedulerOptions {
  cronExpression?: string
  onPhase?: (phase: DreamingPhase) => void
  onError?: (phase: DreamingPhase, error: Error) => void
}

function getNextCronTime(expression: string): Date {
  const now = new Date()
  const parts = expression.split(" ")
  const hour = parseInt(parts[1] || "3", 10)
  const minute = parseInt(parts[0] || "0", 10)

  const next = new Date(now)
  next.setHours(hour, minute, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)
  return next
}

export function createDreamingScheduler(options: DreamingSchedulerOptions = {}) {
  const { cronExpression = "0 3 * * *", onPhase, onError } = options
  let enabled = true
  const history: RunResult[] = []

  async function runPhase(phase: DreamingPhase): Promise<PhaseResult> {
    const start = Date.now()
    try {
      onPhase?.(phase)
      return { phase, durationMs: Date.now() - start, success: true }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      onError?.(phase, error)
      return { phase, durationMs: Date.now() - start, success: false, error: error.message }
    }
  }

  return {
    async runOnce(): Promise<RunResult> {
      if (!enabled) {
        return { completed: false, skipped: true, phases: [], startedAt: new Date() }
      }

      const startedAt = new Date()
      const phases: PhaseResult[] = []
      const phaseOrder: DreamingPhase[] = ["light", "rem", "deep"]

      for (const phase of phaseOrder) {
        const result = await runPhase(phase)
        phases.push(result)
      }

      const completed = phases.every(p => p.success)
      const result: RunResult = {
        completed,
        skipped: false,
        phases,
        startedAt,
        completedAt: new Date(),
      }

      history.push(result)
      return result
    },

    getStatus(): DreamingJobStatus {
      return {
        enabled,
        totalRuns: history.length,
        lastRun: history[history.length - 1],
        nextRun: getNextCronTime(cronExpression),
        history: [...history],
      }
    },

    setEnabled(value: boolean) {
      enabled = value
    },
  }
}
