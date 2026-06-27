import { execSync } from "child_process"
import { readFileSync, readdirSync } from "fs"
import { join, basename } from "path"
import type { InstrumentResult, TraceEntry, LogEntry, RawMetrics } from "./types"

function safeExec(cmd: string, cwd: string, timeout = 60_000): string {
  try {
    return execSync(cmd, { cwd, timeout, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] })
  } catch (error) {
    console.error(`[Instrument] Command failed: ${cmd} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return ""
  }
}

function countLOC(dir: string): { total: number; maxFile: number; count: number; avg: number } {
  let total = 0, maxFile = 0, count = 0
  const codeExts = new Set([".ts", ".tsx", ".js", ".jsx", ".py", ".rs", ".go", ".rb", ".java", ".cs", ".cpp", ".c", ".swift", ".kt"])

  function walk(d: string) {
    try {
      const entries = readdirSync(d, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue
        const full = join(d, entry.name)
        if (entry.isDirectory()) { walk(full); continue }
        const ext = "." + entry.name.split(".").pop()?.toLowerCase()
        if (!codeExts.has(ext)) continue
        try {
          const lines = readFileSync(full, "utf-8").split("\n").length
          total += lines; count++
          if (lines > maxFile) maxFile = lines
        } catch (error) {
          console.error(`[Instrument] Failed to read file ${full}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error(`[Instrument] Failed to walk directory ${d}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  walk(dir)
  return { total, maxFile, count, avg: count > 0 ? Math.round(total / count) : 0 }
}

function countTests(dir: string): { pass: number; fail: number; skip: number; total: number } {
  let testFiles = 0

  function walk(d: string) {
    try {
      const entries = readdirSync(d, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git") continue
        const full = join(d, entry.name)
        if (entry.isDirectory()) { walk(full); continue }
        const name = entry.name.toLowerCase()
        if (name.includes(".test.") || name.includes(".spec.") || name.includes("_test.") || name.includes("_spec.")) {
          testFiles++
        }
      }
    } catch (error) {
      console.error(`[Instrument] Failed to walk directory ${d}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  walk(dir)

  const pkg = tryReadPackage(dir)
  const scripts = (pkg?.scripts ?? {}) as Record<string, string>
  if (scripts.test) {
    const output = safeExec("bun test --timeout 10000 2>&1 || true", dir, 30_000)
    const passMatch = output.match(/(\d+)\s+pass/)
    const failMatch = output.match(/(\d+)\s+fail/)
    const skipMatch = output.match(/(\d+)\s+skip/)
    return {
      pass: passMatch ? parseInt(passMatch[1]) : 0,
      fail: failMatch ? parseInt(failMatch[1]) : 0,
      skip: skipMatch ? parseInt(skipMatch[1]) : 0,
      total: testFiles,
    }
  }
  return { pass: 0, fail: 0, skip: 0, total: testFiles }
}

function countExports(dir: string): number {
  let count = 0
  const codeExts = new Set([".ts", ".tsx", ".js", ".jsx"])

  function walk(d: string) {
    try {
      const entries = readdirSync(d, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git") continue
        const full = join(d, entry.name)
        if (entry.isDirectory()) { walk(full); continue }
        const ext = "." + entry.name.split(".").pop()?.toLowerCase()
        if (!codeExts.has(ext)) continue
        try {
          const content = readFileSync(full, "utf-8")
          const exports = content.match(/^export\s+(default\s+)?(function|class|const|let|var|interface|type|enum)\s+\w+/gm)
          count += exports?.length || 0
        } catch (error) {
          console.error(`[Instrument] Failed to read file ${full}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error(`[Instrument] Failed to walk directory ${d}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  walk(dir)
  return count
}

function countImports(dir: string): number {
  let count = 0
  const codeExts = new Set([".ts", ".tsx", ".js", ".jsx"])

  function walk(d: string) {
    try {
      const entries = readdirSync(d, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git") continue
        const full = join(d, entry.name)
        if (entry.isDirectory()) { walk(full); continue }
        const ext = "." + entry.name.split(".").pop()?.toLowerCase()
        if (!codeExts.has(ext)) continue
        try {
          const content = readFileSync(full, "utf-8")
          const imports = content.match(/^import\s+/gm)
          count += imports?.length || 0
        } catch (error) {
          console.error(`[Instrument] Failed to read file ${full}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error(`[Instrument] Failed to walk directory ${d}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  walk(dir)
  return count
}

function countDeps(dir: string): { direct: number; dev: number } {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
    return {
      direct: Object.keys(pkg.dependencies || {}).length,
      dev: Object.keys(pkg.devDependencies || {}).length,
    }
  } catch (error) {
    console.error(`[Instrument] Failed to read package.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { direct: 0, dev: 0 }
  }
}

function detectCircularDeps(dir: string): string[] {
  const cycles: string[] = []
  const graph = new Map<string, Set<string>>()

  function walk(d: string) {
    try {
      const entries = readdirSync(d, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === ".git") continue
        const full = join(d, entry.name)
        if (entry.isDirectory()) { walk(full); continue }
        const ext = "." + entry.name.split(".").pop()?.toLowerCase()
        if (![".ts", ".tsx", ".js", ".jsx"].includes(ext)) continue
        try {
          const content = readFileSync(full, "utf-8")
          const imports = content.match(/from\s+["']([^"']+)["']/g) || []
          const localImports = imports
            .filter(i => i.includes("./") || i.includes("../"))
            .map(i => i.replace(/from\s+["']/, "").replace(/["']/, ""))
          graph.set(full, new Set(localImports))
        } catch (error) {
          console.error(`[Instrument] Failed to read file ${full}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error(`[Instrument] Failed to walk directory ${d}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  walk(dir)

  for (const [node, deps] of graph) {
    for (const dep of deps) {
      const depPath = join(dir, dep)
      if (graph.has(depPath) && graph.get(depPath)?.has(node.replace(dir, ""))) {
        cycles.push(`${basename(node)} <-> ${basename(depPath)}`)
      }
    }
  }
  return [...new Set(cycles)].slice(0, 10)
}

function tryReadPackage(dir: string): Record<string, unknown> | null {
  try {
    return JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
  } catch (error) {
    console.error(`[Instrument] Failed to read package.json in ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return null
  }
}

export function instrument(repoPath: string, config: { timeout?: number }): InstrumentResult {
  const start = Date.now()
  const traces: TraceEntry[] = []
  const logs: LogEntry[] = []

  traces.push({ timestamp: Date.now(), level: "info", source: "instrumentor", message: "Starting instrumentation" })

  const pkg = tryReadPackage(repoPath)
  const scripts = (pkg?.scripts ?? {}) as Record<string, string>

  if (scripts.test) {
    traces.push({ timestamp: Date.now(), level: "info", source: "instrumentor", message: "Running tests" })
    const testOutput = safeExec("bun test --timeout 15000 2>&1 || true", repoPath, config.timeout || 60_000)
    for (const line of testOutput.split("\n").slice(0, 200)) {
      logs.push({
        timestamp: Date.now(),
        source: "test",
        stream: line.includes("error") || line.includes("Error") ? "stderr" : "stdout",
        line,
      })
    }
  }

  if (scripts.build) {
    traces.push({ timestamp: Date.now(), level: "info", source: "instrumentor", message: "Running build" })
    const buildOut = safeExec("bun run build 2>&1 || true", repoPath, config.timeout || 60_000)
    for (const line of buildOut.split("\n").slice(0, 100)) {
      logs.push({ timestamp: Date.now(), source: "build", stream: "stdout", line })
    }
  }

  const loc = countLOC(repoPath)
  const tests = countTests(repoPath)
  const deps = countDeps(repoPath)
  const circular = detectCircularDeps(repoPath)
  const exportCount = countExports(repoPath)
  const importCount = countImports(repoPath)

  const buildStart = Date.now()
  safeExec(scripts.build || "echo 'no build'", repoPath, 60_000)
  const buildTime = Date.now() - buildStart

  const metrics: RawMetrics = {
    buildTime,
    testCount: tests.total,
    testPass: tests.pass,
    testFail: tests.fail,
    testSkip: tests.skip,
    lintErrors: 0,
    typeErrors: 0,
    fileCount: loc.count,
    totalLOC: loc.total,
    avgFileLength: loc.avg,
    maxFileLength: loc.maxFile,
    dependencyCount: deps.direct,
    devDependencyCount: deps.dev,
    circularDeps: circular,
    exportedSymbols: exportCount,
    importedSymbols: importCount,
  }

  const lintOutput = safeExec("npx eslint . --max-warnings 0 2>&1 || true", repoPath, 30_000)
  metrics.lintErrors = (lintOutput.match(/problems|error/gi) || []).length

  const typeOutput = safeExec("npx tsc --noEmit 2>&1 || true", repoPath, 30_000)
  metrics.typeErrors = (typeOutput.match(/error TS/g) || []).length

  traces.push({ timestamp: Date.now(), level: "info", source: "instrumentor", message: "Instrumentation complete", data: { metrics } })

  return { traces, logs, metrics, duration: Date.now() - start }
}
