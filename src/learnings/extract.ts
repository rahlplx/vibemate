import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"
import type { ExtractedData, DetectedPattern, StyleProfile } from "./types"

const TEST_PATTERNS = [".test.", ".spec.", "_test.", "_spec.", "/tests/", "/test/", "__tests__/"]
const CODE_EXTS = new Set(["ts", "tsx", "js", "jsx"])
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "build", "coverage", ".turbo", ".next"])

function isTestFile(path: string): boolean {
  return TEST_PATTERNS.some(p => path.includes(p))
}

function isCodeFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase()
  return CODE_EXTS.has(ext || "")
}

interface CollectedFile {
  path: string
  content: string
  isTest: boolean
}

function collectAllCode(dir: string): CollectedFile[] {
  const files: CollectedFile[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (IGNORE_DIRS.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) { files.push(...collectAllCode(full)); continue }
      if (isCodeFile(entry.name)) {
        try {
          const content = readFileSync(full, "utf-8")
          files.push({ path: full, content, isTest: isTestFile(full) })
        } catch (error) {
          console.error(`[Extract] Failed to read file ${full}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  } catch (error) {
    console.error(`[Extract] Failed to walk directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  return files
}

function walkCode(dir: string, cb: (path: string, content: string) => void) {
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (IGNORE_DIRS.has(entry.name)) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) { walkCode(full, cb); continue }
      if (isCodeFile(entry.name)) {
        try {
          const content = readFileSync(full, "utf-8")
          cb(full, content)
        } catch (error) {
          console.error(`[Extract] Failed to read file ${full}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  } catch (error) {
    console.error(`[Extract] Failed to walk directory ${dir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// GAP 1: Monorepo detection
interface MonorepoInfo {
  isMonorepo: boolean
  tool: "turborepo" | "nx" | "lerna" | "pnpm-workspaces" | "npm-workspaces" | "unknown" | null
  packages: string[]
  packageCount: number
}

function detectMonorepo(dir: string): MonorepoInfo {
  const result: MonorepoInfo = { isMonorepo: false, tool: null, packages: [], packageCount: 0 }

  // Check package.json workspaces
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
    if (pkg.workspaces) {
      result.isMonorepo = true
      if (Array.isArray(pkg.workspaces)) {
        result.packages = pkg.workspaces
      } else if (pkg.workspaces.packages) {
        result.packages = pkg.workspaces.packages
      }
    }
  } catch (error) {
    console.error(`[Extract] Failed to read package.json for monorepo detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Detect tool
  if (existsSync(join(dir, "turbo.json"))) result.tool = "turborepo"
  else if (existsSync(join(dir, "nx.json"))) result.tool = "nx"
  else if (existsSync(join(dir, "lerna.json"))) result.tool = "lerna"
  else if (existsSync(join(dir, "pnpm-workspace.yaml"))) result.tool = "pnpm-workspaces"
  else if (result.isMonorepo) result.tool = "npm-workspaces"

  // Count actual packages
  if (result.isMonorepo) {
    for (const pattern of result.packages) {
      const globPattern = pattern.replace("/*", "")
      const pkgDir = join(dir, globPattern)
      if (existsSync(pkgDir)) {
        try {
          const entries = readdirSync(pkgDir, { withFileTypes: true })
          for (const entry of entries) {
            if (entry.isDirectory() && existsSync(join(pkgDir, entry.name, "package.json"))) {
              result.packageCount++
            }
          }
        } catch (error) {
          console.error(`[Extract] Failed to read package directory ${pkgDir}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
  }

  return result
}

// GAP 4: Inline config detection
function detectInlineConfigs(dir: string): string[] {
  const configs: string[] = []
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
    if (pkg.prettier) configs.push("prettier")
    if (pkg.eslintConfig || pkg.eslintConfigOverride) configs.push("eslint")
    if (pkg.stylelint) configs.push("stylelint")
  } catch (error) {
    console.error(`[Extract] Failed to read package.json for inline config detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  return configs
}

// GAP 5: API surface analysis
interface ApiSurface {
  exportedTypes: number
  exportedFunctions: number
  exportedClasses: number
  exportedConstants: number
  documentedExports: number
  totalExports: number
  jsdocCoverage: number
}

function analyzeApiSurface(dir: string): ApiSurface {
  const surface: ApiSurface = {
    exportedTypes: 0, exportedFunctions: 0, exportedClasses: 0,
    exportedConstants: 0, documentedExports: 0, totalExports: 0, jsdocCoverage: 0,
  }

  walkCode(dir, (_path, content) => {
    const lines = content.split("\n")
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Count export types
      if (line.match(/^export\s+(type|interface)\s+\w+/)) surface.exportedTypes++
      if (line.match(/^export\s+(default\s+)?function\s+\w+/)) surface.exportedFunctions++
      if (line.match(/^export\s+(default\s+)?class\s+\w+/)) surface.exportedClasses++
      if (line.match(/^export\s+(const|let|var)\s+\w+/)) surface.exportedConstants++

      if (line.match(/^export\s/)) {
        surface.totalExports++
        // Check if previous lines have JSDoc
        let hasJsDoc = false
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          if (lines[j].includes("*/")) { hasJsDoc = true; break }
          if (lines[j].match(/^\s*(\/\*\*|\/\/|\/\*|$)/) && !lines[j].includes("/**")) break
        }
        if (hasJsDoc) surface.documentedExports++
      }
    }
  })

  surface.jsdocCoverage = surface.totalExports > 0
    ? surface.documentedExports / surface.totalExports
    : 0

  return surface
}

// GAP 6: Streaming/async pattern detection
function detectAsyncPatterns(dir: string): string[] {
  const patterns = new Set<string>()

  walkCode(dir, (_path, content) => {
    if (content.match(/AsyncIterator|AsyncIterable|for\s+await\s*\(/)) patterns.add("async-iterator")
    if (content.match(/yield\s*\*?|function\*|generator/i)) patterns.add("generator")
    if (content.match(/Observable|subscribe|Subject/i)) patterns.add("observable")
    if (content.match(/EventEmitter|\.on\(|\.emit\(/)) patterns.add("event-emitter")
    if (content.match(/ReadableStream|WritableStream|TransformStream/)) patterns.add("web-streams")
    if (content.match(/createReadStream|createWriteStream/)) patterns.add("node-streams")
  })

  return [...patterns]
}

// GAP 7: Security pattern detection
interface SecurityPatterns {
  apiKeyHandling: boolean
  envVarUsage: string[]
  deprecatedSecurityPatterns: string[]
  authPatterns: string[]
  secretPatterns: string[]
}

function detectSecurityPatterns(dir: string): SecurityPatterns {
  const result: SecurityPatterns = {
    apiKeyHandling: false, envVarUsage: [], deprecatedSecurityPatterns: [],
    authPatterns: [], secretPatterns: [],
  }

  walkCode(dir, (_path, content) => {
    if (content.match(/api[_-]?key|apiKey|API_KEY/i)) result.apiKeyHandling = true
    const envVars = content.match(/process\.env\.(\w+)/g) || []
    result.envVarUsage.push(...envVars)
    if (content.match(/@deprecated|DEPRECATED/i)) result.deprecatedSecurityPatterns.push("deprecated-usage")
    if (content.match(/bearer|authorization|token|jwt|oauth/i)) result.authPatterns.push("auth-detected")
    if (content.match(/password|secret|private.?key|credentials/i)) result.secretPatterns.push("secret-pattern")
  })

  result.envVarUsage = [...new Set(result.envVarUsage)]
  return result
}

// GAP 8: Test organization analysis
interface TestOrganization {
  totalTestFiles: number
  testDirectories: string[]
  testCategories: string[]
  hasUnitTests: boolean
  hasIntegrationTests: boolean
  hasE2ETests: boolean
  hasMocks: boolean
  testFramework: string | null
  avgTestFileSize: number
}

function analyzeTestOrganization(dir: string): TestOrganization {
  const result: TestOrganization = {
    totalTestFiles: 0, testDirectories: [], testCategories: [],
    hasUnitTests: false, hasIntegrationTests: false, hasE2ETests: false,
    hasMocks: false, testFramework: null, avgTestFileSize: 0,
  }

  let totalTestSize = 0

  function walkTests(d: string) {
    try {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        if (IGNORE_DIRS.has(entry.name)) continue
        const full = join(d, entry.name)
        if (entry.isDirectory()) {
          const rel = relative(dir, full).toLowerCase()
          if (entry.name === "tests" || entry.name === "test" || entry.name === "__tests__") {
            result.testDirectories.push(relative(dir, full))
          }
          if (rel.includes("unit")) { result.hasUnitTests = true; result.testCategories.push("unit") }
          if (rel.includes("integration")) { result.hasIntegrationTests = true; result.testCategories.push("integration") }
          if (rel.includes("e2e") || rel.includes("end-to-end")) { result.hasE2ETests = true; result.testCategories.push("e2e") }
          if (rel.includes("mock") || rel.includes("fixture")) { result.hasMocks = true; result.testCategories.push("mocks") }
          if (rel.includes("smoke")) { result.testCategories.push("smoke") }
          walkTests(full)
          continue
        }
        if (isTestFile(full)) {
          result.totalTestFiles++
          try {
            const stat = statSync(full)
            totalTestSize += stat.size
          } catch (error) {
            console.error(`[Extract] Failed to stat test file ${full}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
      }
    } catch (error) {
      console.error(`[Extract] Failed to walk test directory ${d}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  walkTests(dir)

  result.testDirectories = [...new Set(result.testDirectories)]
  result.testCategories = [...new Set(result.testCategories)]
  result.avgTestFileSize = result.totalTestFiles > 0 ? Math.round(totalTestSize / result.totalTestFiles) : 0

  // Detect test framework
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps.vitest) result.testFramework = "vitest"
    else if (deps.jest) result.testFramework = "jest"
    else if (deps.mocha) result.testFramework = "mocha"
    else if (deps["bun:test"] || deps["@types/bun"]) result.testFramework = "bun"
  } catch (error) {
    console.error(`[Extract] Failed to read package.json for test framework detection: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result
}

function detectDesignPatterns(dir: string): DetectedPattern[] {
  const patterns: DetectedPattern[] = []

  walkCode(dir, (path, content) => {
    if (content.match(/private\s+static\s+instance|getInstance|_instance/i)) {
      patterns.push({ name: "Singleton", type: "design", locations: [{ file: path, line: 1 }], confidence: 0.8, description: "Singleton pattern detected" })
    }
    if (content.match(/create\w+\(|factory|Factory/i)) {
      patterns.push({ name: "Factory", type: "design", locations: [{ file: path, line: 1 }], confidence: 0.7, description: "Factory pattern detected" })
    }
    if (content.match(/adapter|Adapter|implements.*Adapter/i)) {
      patterns.push({ name: "Adapter", type: "architectural", locations: [{ file: path, line: 1 }], confidence: 0.75, description: "Adapter pattern detected" })
    }
    if (content.match(/\.build\(\)|Builder/i)) {
      patterns.push({ name: "Builder", type: "design", locations: [{ file: path, line: 1 }], confidence: 0.7, description: "Builder pattern detected" })
    }
    if (content.match(/addEventListener|on\(|emit\(|subscribe|Observable/i)) {
      patterns.push({ name: "Observer", type: "design", locations: [{ file: path, line: 1 }], confidence: 0.7, description: "Observer pattern detected" })
    }
    if (content.match(/strategy|Strategy|implements.*Strategy/i)) {
      patterns.push({ name: "Strategy", type: "design", locations: [{ file: path, line: 1 }], confidence: 0.7, description: "Strategy pattern detected" })
    }

    // GAP 6: Async/streaming patterns
    if (content.match(/AsyncIterator|AsyncIterable|for\s+await\s*\(/)) {
      patterns.push({ name: "AsyncIterator", type: "architectural", locations: [{ file: path, line: 1 }], confidence: 0.85, description: "Async iteration pattern" })
    }

    // Only flag anti-patterns for SOURCE files, not test files
    if (!isTestFile(path)) {
      const lines = content.split("\n").length
      if (lines > 500) {
        patterns.push({ name: "God File", type: "anti", locations: [{ file: path, line: 1 }], confidence: 0.9, description: `File has ${lines} lines` })
      }
      const maxNesting = Math.max(...content.split("\n").map(line => {
        const indent = line.match(/^\s*/)?.[0]?.length || 0
        return Math.floor(indent / 2)
      }))
      if (maxNesting > 5) {
        patterns.push({ name: "Deep Nesting", type: "anti", locations: [{ file: path, line: 1 }], confidence: 0.8, description: `Max nesting depth: ${maxNesting}` })
      }
    }
  })

  return patterns
}

function detectCodingStyle(dir: string): StyleProfile {
  let indentSpaces = 0, indentTabs = 0
  let singleQuotes = 0, doubleQuotes = 0
  let semicolons = 0, noSemicolons = 0
  let maxLine = 0

  walkCode(dir, (_path, content) => {
    for (const line of content.split("\n")) {
      if (line.startsWith("\t")) indentTabs++
      else if (line.startsWith("  ")) indentSpaces++
      if (line.includes("'")) singleQuotes++
      if (line.includes('"')) doubleQuotes++
      if (line.trimEnd().endsWith(";")) semicolons++
      else if (line.trim().length > 0) noSemicolons++
      if (line.length > maxLine) maxLine = line.length
    }
  })

  return {
    indentStyle: indentTabs > indentSpaces ? "tabs" : "spaces",
    indentSize: indentSpaces > indentTabs ? 2 : 4,
    lineWidth: maxLine,
    quoteStyle: singleQuotes > doubleQuotes ? "single" : "double",
    semicolons: semicolons > noSemicolons,
    namingConvention: "camelCase",
  }
}

function detectConventions(dir: string): string[] {
  const conventions: string[] = []
  if (existsSync(join(dir, ".editorconfig"))) conventions.push("editorconfig")
  if (existsSync(join(dir, ".prettierrc"))) conventions.push("prettier")
  if (existsSync(join(dir, ".eslintrc")) || existsSync(join(dir, ".eslintrc.js")) || existsSync(join(dir, ".eslintrc.json"))) conventions.push("eslint")
  if (existsSync(join(dir, "tsconfig.json"))) conventions.push("typescript-strict")
  if (existsSync(join(dir, ".github", "workflows"))) conventions.push("ci-cd")
  if (existsSync(join(dir, "CONTRIBUTING.md"))) conventions.push("contributing-guide")
  if (existsSync(join(dir, "LICENSE"))) conventions.push("licensed")
  if (existsSync(join(dir, ".gitignore"))) conventions.push("gitignore")
  if (existsSync(join(dir, ".env.example"))) conventions.push("env-example")
  if (existsSync(join(dir, "SECURITY.md"))) conventions.push("security-policy")
  if (existsSync(join(dir, "CODE_OF_CONDUCT.md"))) conventions.push("code-of-conduct")

  // GAP 4: Check inline configs in package.json
  const inlineConfigs = detectInlineConfigs(dir)
  for (const c of inlineConfigs) {
    if (!conventions.includes(c)) conventions.push(c)
  }

  return conventions
}

function detectErrorHandling(dir: string): "typed" | "generic" | "mixed" {
  let typed = 0, generic = 0, hierarchyClasses = 0

  walkCode(dir, (_path, content) => {
    if (content.match(/catch\s*\(\s*\w+\s*:\s*\w+Error/)) typed++
    if (content.match(/catch\s*\(\s*\w+\s*\)/)) generic++
    if (content.match(/throw\s+new\s+\w+Error/)) typed++
    if (content.match(/throw\s+/)) generic++
    // GAP 2: Detect error class hierarchies
    if (content.match(/class\s+\w+Error\s+extends\s+\w+Error/)) hierarchyClasses++
  })

  // If we detect error class hierarchies, it's well-typed
  if (hierarchyClasses >= 1) return "typed"
  if (typed > 0 && generic === 0) return "typed"
  if (generic > 0 && typed === 0) return "generic"
  return "mixed"
}

function extractEntryPoints(dir: string): string[] {
  const entryPoints: string[] = []
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
    if (pkg.main) entryPoints.push(pkg.main)
    if (pkg.bin) {
      if (typeof pkg.bin === "string") entryPoints.push(pkg.bin)
      else Object.values(pkg.bin).forEach(v => entryPoints.push(v as string))
    }
    if (pkg.exports) {
      if (typeof pkg.exports === "string") entryPoints.push(pkg.exports)
      else if (typeof pkg.exports === "object") {
        Object.values(pkg.exports).forEach(v => {
          if (typeof v === "string") entryPoints.push(v)
          else if (v && typeof v === "object" && "import" in v) entryPoints.push((v as { import: string }).import)
        })
      }
    }
  } catch (error) {
    console.error(`[Extract] Failed to read package.json for entry points: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const commonEntries = ["src/index.ts", "src/index.js", "src/main.ts", "src/main.js", "index.ts", "index.js", "main.ts", "main.js"]
  for (const entry of commonEntries) {
    if (existsSync(join(dir, entry)) && !entryPoints.includes(entry)) {
      entryPoints.push(entry)
    }
  }
  return [...new Set(entryPoints)]
}

function detectLayerViolations(dir: string): string[] {
  const violations: string[] = []
  walkCode(dir, (path, content) => {
    const isUI = path.includes("/components/") || path.includes("/pages/")
    if (isUI) {
      const imports = content.match(/from\s+["']([^"']+)["']/g) || []
      for (const imp of imports) {
        if (imp.includes("/repositories/") || imp.includes("/adapters/")) {
          violations.push(`${path}: UI imports from infrastructure layer`)
        }
      }
    }
  })
  return [...new Set(violations)].slice(0, 20)
}

function extractDependencyData(dir: string) {
  const direct: Array<{ name: string; version: string; license: string; size: number | null }> = []
  const dev: Array<{ name: string; version: string; license: string; size: number | null }> = []

  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
    for (const [name, version] of Object.entries(pkg.dependencies || {})) {
      direct.push({ name, version: version as string, license: "unknown", size: null })
    }
    for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
      dev.push({ name, version: version as string, license: "unknown", size: null })
    }
  } catch (error) {
    console.error(`[Extract] Failed to read package.json for dependency data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const usedDeps = new Set<string>()
  walkCode(dir, (_path, content) => {
    const imports = content.match(/from\s+["']([^"@][^"']*)["']/g) || []
    for (const imp of imports) {
      const pkg = imp.replace(/from\s+["']/, "").replace(/["']/, "").split("/")[0]
      usedDeps.add(pkg)
    }
  })

  const unused = direct.filter(d => !usedDeps.has(d.name)).map(d => d.name)
  return { direct, dev, outdated: [] as string[], vulnerable: [] as string[], unused, bundled: false }
}

export function extractData(repoPath: string): ExtractedData {
  const allFiles = collectAllCode(repoPath)
  const sourceFiles = allFiles.filter(f => !f.isTest)
  const testFiles = allFiles.filter(f => f.isTest)

  const patterns = detectDesignPatterns(repoPath)
  const style = detectCodingStyle(repoPath)
  const conventions = detectConventions(repoPath)
  const errorHandling = detectErrorHandling(repoPath)
  const entryPoints = extractEntryPoints(repoPath)
  const layerViolations = detectLayerViolations(repoPath)
  const deps = extractDependencyData(repoPath)
  const monorepo = detectMonorepo(repoPath)
  const apiSurface = analyzeApiSurface(repoPath)
  const asyncPatterns = detectAsyncPatterns(repoPath)
  const security = detectSecurityPatterns(repoPath)
  const testOrg = analyzeTestOrganization(repoPath)

  let sourceLines = 0, testLines = 0
  let maxFileLen = 0
  for (const f of sourceFiles) {
    const len = f.content.split("\n").length
    sourceLines += len
    if (len > maxFileLen) maxFileLen = len
  }
  for (const f of testFiles) {
    testLines += f.content.split("\n").length
  }

  const totalFiles = allFiles.length
  const avgFileLen = totalFiles > 0 ? Math.round((sourceLines + testLines) / totalFiles) : 0
  const testToSource = sourceLines > 0 ? testLines / sourceLines : 0

  return {
    metrics: {
      buildTime: null, testCount: testOrg.totalTestFiles, testPass: 0, testFail: 0, testSkip: 0,
      lintErrors: 0, typeErrors: 0, fileCount: totalFiles, totalLOC: sourceLines + testLines,
      avgFileLength: avgFileLen, maxFileLength: maxFileLen, dependencyCount: deps.direct.length,
      devDependencyCount: deps.dev.length, circularDeps: [],
      exportedSymbols: apiSurface.totalExports, importedSymbols: 0,
    },
    architecture: {
      moduleCount: monorepo.packageCount, avgModuleSize: 0, maxModuleDepth: 0, entryPoints,
      circularDependencies: [], layerViolations,
      adapterPatterns: patterns.filter(p => p.name === "Adapter").map(p => p.locations[0]?.file || ""),
      diContainers: [],
    },
    patterns: {
      designPatterns: patterns.filter(p => p.type === "design"),
      antiPatterns: patterns.filter(p => p.type === "anti"),
      codingStyle: style, conventions,
    },
    quality: {
      testCoverage: null, testToSourceRatio: testToSource, assertionDensity: 0,
      errorHandling, documentationCoverage: apiSurface.jsdocCoverage,
      typeCoverage: conventions.includes("typescript-strict") ? 0.9 : 0.5,
      complexityScore: patterns.filter(p => p.type === "anti").length,
    },
    dependencies: deps,
    monorepo: { isMonorepo: monorepo.isMonorepo, tool: monorepo.tool, packageCount: monorepo.packageCount },
    apiSurface: {
      totalExports: apiSurface.totalExports, jsdocCoverage: apiSurface.jsdocCoverage,
      exportedTypes: apiSurface.exportedTypes, exportedFunctions: apiSurface.exportedFunctions,
    },
    asyncPatterns,
    security: { apiKeyHandling: security.apiKeyHandling, envVarUsage: security.envVarUsage, authPatterns: security.authPatterns },
    testOrg: {
      totalTestFiles: testOrg.totalTestFiles, testCategories: testOrg.testCategories,
      hasUnitTests: testOrg.hasUnitTests, hasIntegrationTests: testOrg.hasIntegrationTests,
      testFramework: testOrg.testFramework,
    },
  }
}
