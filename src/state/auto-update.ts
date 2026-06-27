export interface TestResults {
  total: number
  passing: number
  failing: number
  skipped: number
}

export interface PipelineState {
  phase: string
  completed: string[]
  testResults: TestResults
  harnessChecks: Record<string, string>
  lastUpdate: string
}

const TOTAL_SLICES = 20

function createDefaultState(): PipelineState {
  return {
    phase: "idle",
    completed: [],
    testResults: { total: 0, passing: 0, failing: 0, skipped: 0 },
    harnessChecks: {},
    lastUpdate: new Date().toISOString(),
  }
}

export function createStateManager(json?: string) {
  let state: PipelineState = json ? JSON.parse(json) : createDefaultState()

  function markUpdated() {
    state.lastUpdate = new Date().toISOString()
  }

  return {
    getState(): PipelineState {
      return { ...state }
    },

    advancePhase(phase: string) {
      state.phase = phase
      markUpdated()
    },

    updateTestResults(results: TestResults) {
      state.testResults = { ...results }
      markUpdated()
    },

    recordHarnessCheck(name: string, result: string) {
      state.harnessChecks[name] = result
      markUpdated()
    },

    completeSlice(sliceId: string) {
      if (!state.completed.includes(sliceId)) {
        state.completed.push(sliceId)
        markUpdated()
      }
    },

    toJSON(): string {
      return JSON.stringify(state, null, 2)
    },

    getCompletionPercent(): number {
      return Math.round((state.completed.length / TOTAL_SLICES) * 100)
    },
  }
}
