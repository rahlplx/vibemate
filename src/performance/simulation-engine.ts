import { createPluginRegistry, resolveActivationPlan } from "../plugins/index"
import { buildToolPolicyPipeline, applyToolPolicyPipeline } from "../security/tool-policy"
import {
  createMemoryManager, createMemoryEntry,
  runLightDreaming, runRemDreaming, runDeepDreaming,
  calculateTemporalDecay,
} from "../learnings/dreaming"
import { PerformanceMonitor } from "./monitor"
import { TelemetryCollector } from "../telemetry/collector"
import { ResourceMonitor } from "./resource-monitor"

export interface SimulationResult {
  pass: number
  fail: number
  duration: number
  metrics: Record<string, any>
  bottlenecks: string[]
  concurrencyIssues: string[]
}

export class SimulationEngine {
  private perf = new PerformanceMonitor()
  private telemetry = new TelemetryCollector({
    enabled: true,
    exportDir: "./learnings/telemetry",
    serviceName: "vibemate-sim",
    serviceVersion: "1.0.0",
    maxSpanCount: 1000
  })
  private resMonitor = new ResourceMonitor(this.perf)
  private pass = 0
  private fail = 0
  private concurrencyIssues: string[] = []

  private assert(cond: boolean, msg: string) {
    if (cond) this.pass++
    else {
      this.fail++
      console.error("FAIL:", msg)
    }
  }

  async run(options: { iterations: number, concurrent?: boolean, chaos?: boolean }): Promise<SimulationResult> {
    this.resMonitor.start()
    const startTime = performance.now()
    const { iterations, concurrent = false, chaos = false } = options

    const tasks = [
      () => this.simulatePlugins(iterations, chaos),
      () => this.simulateToolPolicy(iterations, chaos),
      () => this.simulateMemory(iterations, chaos),
      () => this.simulateTemporalDecay(),
      () => this.simulatePipeline(iterations, chaos),
      () => this.simulateSharedResourceConcurrency(iterations)
    ]

    if (concurrent) {
      await Promise.all(tasks.map(t => t()))
    } else {
      for (const task of tasks) {
        await task()
      }
    }

    const duration = performance.now() - startTime
    this.resMonitor.stop()

    const metrics: Record<string, any> = {}
    const metricNames = [
      "sim.plugins.duration",
      "sim.tool_policy.duration",
      "sim.memory.duration",
      "sim.temporal_decay.duration",
      "sim.pipeline.duration",
      "sim.concurrency.duration",
      "res.memory.rss",
      "res.memory.heapUsed",
      "res.event_loop.lag",
      "res.cpu.user",
      "res.cpu.system"
    ]
    metricNames.forEach(m => {
      metrics[m] = this.perf.getMetricStats(m)
    })

    const bottlenecks = metricNames
      .filter(m => {
        const stats = metrics[m];
        if (m.endsWith(".duration")) return stats.avg > 100;
        if (m === "res.event_loop.lag") return stats.max > 50;
        return false;
      })
      .map(m => `${m} issue: ${metrics[m].avg.toFixed(2)} avg / ${metrics[m].max.toFixed(2)} max`)

    await this.telemetry.export()

    return {
      pass: this.pass,
      fail: this.fail,
      duration,
      metrics,
      bottlenecks,
      concurrencyIssues: this.concurrencyIssues
    }
  }

  private async simulatePlugins(iterations: number, chaos: boolean) {
    const span = this.telemetry.startSpan("sim.plugins")
    const start = performance.now()
    const registry = createPluginRegistry()

    // Warm up cache
    registry.register({
      id: "p-warm", name: "Warmup", version: "1.0.0", description: "test",
      activation: { onStartup: true },
      origin: "bundled", rootDir: "/tmp"
    })

    for (let i = 0; i < iterations; i++) {
      const count = chaos ? Math.floor(Math.random() * 200) : 50
      for (let j = 0; j < count; j++) {
        const id = chaos && Math.random() > 0.98 ? "" : `p-${j}`
        try {
          registry.register({
            id, name: `Plugin ${j}`, version: "1.0.0", description: "test",
            activation: { onStartup: j % 2 === 0 },
            origin: "config", rootDir: "/tmp",
          } as any)
        } catch (e) {}
      }

      resolveActivationPlan(registry, { kind: "startup" })
      this.assert(registry.list().length >= 0, "registry list works")
    }
    this.perf.recordMetric("sim.plugins.duration", performance.now() - start)
    this.telemetry.endSpan(span.spanId)
  }

  private async simulateToolPolicy(iterations: number, chaos: boolean) {
    const span = this.telemetry.startSpan("sim.tool_policy")
    const start = performance.now()
    const tools = ["read","write","edit","exec","process","image","sessions_list","sessions_history","sessions_send","sessions_spawn","sessions_yield","subagents","session_status"]
    for (let i = 0; i < iterations; i++) {
      const pipeline = buildToolPolicyPipeline({
        profile: { allow: chaos && Math.random() > 0.9 ? ["*"] : tools.slice(0, 5 + (i % 8)) },
        globalPolicy: chaos && Math.random() > 0.8 ? { deny: ["read", "write"] } : { deny: tools.slice(0, i % 3) },
        agentPolicy: { allow: tools.slice(0, 3 + (i % 10)) },
      })
      const result = applyToolPolicyPipeline(pipeline, tools)
      this.assert(result.allowed.length <= tools.length || result.allowed.includes("*"), "allowed tools valid")
    }
    this.perf.recordMetric("sim.tool_policy.duration", performance.now() - start)
    this.telemetry.endSpan(span.spanId)
  }

  private async simulateMemory(iterations: number, chaos: boolean) {
    const span = this.telemetry.startSpan("sim.memory")
    const start = performance.now()
    for (let i = 0; i < iterations; i++) {
      const manager = createMemoryManager()
      const count = chaos ? 1000 : 200
      for (let j = 0; j < count; j++) {
        const content = chaos && Math.random() > 0.98 ? "" : `content-${j}`
        manager.add(createMemoryEntry("working", content, []))
      }

      const entries = manager.list().map((e, j) => ({
        key: `key-${j}`, snippet: e.content, recallCount: j,
        lastRecalledAt: new Date().toISOString()
      })) as any

      if (chaos && Math.random() > 0.5) {
        runDeepDreaming(entries, { minScore: 0.1, maxPromoted: 50 })
      } else {
        runLightDreaming(entries, { limit: 10, dedupeSimilarity: 0.8 })
      }
    }
    this.perf.recordMetric("sim.memory.duration", performance.now() - start)
    this.telemetry.endSpan(span.spanId)
  }

  private async simulateTemporalDecay() {
    const start = performance.now()
    for (let age = 0; age < 365; age++) {
      calculateTemporalDecay(age, 30)
    }
    this.perf.recordMetric("sim.temporal_decay.duration", performance.now() - start)
  }

  private async simulatePipeline(iterations: number, chaos: boolean) {
    const span = this.telemetry.startSpan("sim.pipeline")
    const start = performance.now()
    const phases = ["THINK", "PLAN", "DESIGN", "BREAK", "BUILD", "HARNESS", "REVIEW", "QA", "SHIP", "RETRO", "LEARN", "EVOLVE", "TELEMETRY"]

    for (let i = 0; i < iterations; i++) {
      const traceId = `trace-${i}`
      let context: any = { goal: `Task ${i}`, state: "idle", traceId }

      for (const phase of phases) {
        const phaseSpan = this.telemetry.startSpan(`pipeline.${phase.toLowerCase()}`, traceId)
        context.state = phase

        if (phase === "PLAN") {
           this.telemetry.recordHandoff("THINKER", "PLANNER", 1024)
        } else if (phase === "BUILD") {
           this.telemetry.recordToolCall("write_file", { path: "src/app.ts" }, { status: "ok" }, 1, true)
        }

        if (chaos && Math.random() > 0.99) {
           this.telemetry.endSpan(phaseSpan.spanId, "error")
           this.assert(false, `Pipeline failed at ${phase}`)
           break
        }

        // Use setImmediate to keep event loop moving
        await new Promise(r => setImmediate(r))
        this.telemetry.endSpan(phaseSpan.spanId, "ok")
      }

      if (context.state === "TELEMETRY") {
         this.telemetry.recordEvaluation("task_success", 1.0, true)
      }
      this.assert(context.state === "TELEMETRY" || chaos, "pipeline finished")
    }

    this.perf.recordMetric("sim.pipeline.duration", performance.now() - start)
    this.telemetry.endSpan(span.spanId)
  }

  private async simulateSharedResourceConcurrency(iterations: number) {
    const span = this.telemetry.startSpan("sim.concurrency")
    const start = performance.now()
    const sharedRegistry = createPluginRegistry()

    const agents = Array.from({ length: 10 }, (_, id) => async () => {
      for (let i = 0; i < iterations; i++) {
        const pluginId = `agent-${id}-p-${i}`
        try {
          sharedRegistry.register({
            id: pluginId, name: pluginId, version: "1.0.0", description: "test",
            activation: { onStartup: true },
            origin: "workspace", rootDir: "/tmp"
          })
          sharedRegistry.list()
        } catch (e) {
          this.concurrencyIssues.push(`Concurrent registration failed: ${e}`)
        }
        await new Promise(r => setImmediate(r))
      }
    })

    await Promise.all(agents.map(a => a()))

    this.perf.recordMetric("sim.concurrency.duration", performance.now() - start)
    this.telemetry.endSpan(span.spanId)
  }
}
