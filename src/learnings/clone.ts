import { execSync } from "child_process"
import { readFileSync } from "fs"
import { join } from "path"
import type { RepoConfig, CloneResult } from "./types"

async function execAsync(cmd: string, opts: { timeout?: number } = {}): Promise<string> {
  return new Promise((resolve) => {
    execSync(cmd, { timeout: opts.timeout || 300_000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] })
    resolve("")
  })
}

function countFiles(dir: string): number {
  let count = 0
  try {
    for (const entry of require("fs").readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git") continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) count += countFiles(full)
      else count++
    }
  } catch { /* ignore */ }
  return count
}

function detectLanguages(dir: string): Record<string, number> {
  const langs: Record<string, number> = {}
  const extMap: Record<string, string> = {
    ".ts": "TypeScript", ".tsx": "TSX", ".js": "JavaScript",
    ".jsx": "JSX", ".py": "Python", ".rs": "Rust", ".go": "Go",
    ".rb": "Ruby", ".java": "Java", ".cs": "C#", ".cpp": "C++",
    ".c": "C", ".swift": "Swift", ".kt": "Kotlin", ".vue": "Vue",
    ".svelte": "Svelte", ".css": "CSS", ".scss": "SCSS",
    ".html": "HTML", ".json": "JSON", ".yaml": "YAML", ".yml": "YAML",
    ".md": "Markdown", ".toml": "TOML",
  }

  function walk(d: string) {
    try {
      for (const entry of require("fs").readdirSync(d, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".git") continue
        const full = join(d, entry.name)
        if (entry.isDirectory()) { walk(full); continue }
        const ext = "." + entry.name.split(".").pop()?.toLowerCase()
        const lang = extMap[ext]
        if (lang) langs[lang] = (langs[lang] || 0) + 1
      }
    } catch { /* ignore */ }
  }
  walk(dir)
  return langs
}

function detectPackageManager(dir: string): string | null {
  if (require("fs").existsSync(join(dir, "bun.lockb")) || require("fs").existsSync(join(dir, "bun.lock"))) return "bun"
  if (require("fs").existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm"
  if (require("fs").existsSync(join(dir, "yarn.lock"))) return "yarn"
  if (require("fs").existsSync(join(dir, "package-lock.json"))) return "npm"
  if (require("fs").existsSync(join(dir, "Cargo.toml"))) return "cargo"
  if (require("fs").existsSync(join(dir, "go.mod"))) return "go"
  if (require("fs").existsSync(join(dir, "requirements.txt")) || require("fs").existsSync(join(dir, "pyproject.toml"))) return "pip"
  return null
}

function hasTests(dir: string): boolean {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf-8"))
    return !!(pkg.scripts?.test)
  } catch { return false }
}

function hasCI(dir: string): boolean {
  return require("fs").existsSync(join(dir, ".github", "workflows")) ||
    require("fs").existsSync(join(dir, ".gitlab-ci.yml"))
}

export async function cloneRepo(config: RepoConfig, workDir: string): Promise<CloneResult> {
  const start = Date.now()
  const folderName = new URL(config.url).pathname.split("/").pop()?.replace(".git", "") || "repo"
  const targetPath = join(workDir, folderName)

  const cloneArgs = ["git clone"]
  if (config.depth) cloneArgs.push(`--depth ${config.depth}`)
  if (config.branch) cloneArgs.push(`--branch ${config.branch}`)
  cloneArgs.push(config.url, `"${targetPath}"`)

  await execAsync(cloneArgs.join(" "), { timeout: config.timeout })

  const branch = config.branch || execSync("git rev-parse --abbrev-ref HEAD", {
    cwd: targetPath, encoding: "utf-8",
  }).trim()

  const commitHash = execSync("git rev-parse --short HEAD", {
    cwd: targetPath, encoding: "utf-8",
  }).trim()

  const commitMessage = execSync("git log -1 --pretty=%s", {
    cwd: targetPath, encoding: "utf-8",
  }).trim()

  const pkgMgr = detectPackageManager(targetPath)
  if (pkgMgr) {
    const installCmd = config.installCmd || ({
      bun: "bun install", pnpm: "pnpm install", yarn: "yarn install",
      npm: "npm install", cargo: "cargo build", go: "go mod download",
      pip: "pip install -r requirements.txt",
    } as Record<string, string>)[pkgMgr]
    if (installCmd) execSync(installCmd, { cwd: targetPath, timeout: config.timeout, encoding: "utf-8" })
  }

  if (config.buildCmd) {
    execSync(config.buildCmd, { cwd: targetPath, timeout: config.timeout, encoding: "utf-8" })
  }

  return {
    path: targetPath,
    branch,
    commitHash,
    commitMessage,
    fileCount: countFiles(targetPath),
    languages: detectLanguages(targetPath),
    packageManager: pkgMgr,
    hasTests: hasTests(targetPath),
    hasCI: hasCI(targetPath),
    setupDuration: Date.now() - start,
  }
}
