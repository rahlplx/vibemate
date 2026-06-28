import { writeFile, mkdir, appendFile } from 'fs/promises';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';

export interface RepoAnalysis {
  url: string;
  clonedAt: string;
  languages: Record<string, number>;
  fileCount: number;
  commitCount: number;
  topContributors: { author: string; count: number }[];
  hasTests: boolean;
  hasCI: boolean;
  packageManager: string | null;
  detectedPatterns: string[];
  configFiles: string[];
}

export interface RepoMineResult {
  url: string;
  dbId: string;
  analysis: RepoAnalysis;
  okfPath: string | null;
  jsonlRecordsWritten: number;
}

export interface RepoMineOptions {
  depth?: number;
  vibeDir?: string;
  dryRun?: boolean;
  /** Skip git clone — use localPath directly (for tests) */
  skipClone?: boolean;
  localPath?: string;
}

function detectLanguages(dir: string): Record<string, number> {
  const langs: Record<string, number> = {};
  const extMap: Record<string, string> = {
    '.ts': 'TypeScript', '.tsx': 'TSX', '.js': 'JavaScript', '.jsx': 'JSX',
    '.py': 'Python', '.rs': 'Rust', '.go': 'Go', '.rb': 'Ruby',
    '.java': 'Java', '.cs': 'C#', '.cpp': 'C++', '.c': 'C',
    '.swift': 'Swift', '.kt': 'Kotlin', '.vue': 'Vue', '.svelte': 'Svelte',
  };

  function walk(d: string) {
    try {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        const full = join(d, entry.name);
        if (entry.isDirectory()) { walk(full); continue; }
        const ext = '.' + entry.name.split('.').pop()?.toLowerCase();
        const lang = extMap[ext];
        if (lang) langs[lang] = (langs[lang] || 0) + 1;
      }
    } catch { /* ignore unreadable dirs */ }
  }
  walk(dir);
  return langs;
}

function detectPatterns(dir: string): string[] {
  const patterns: string[] = [];
  try {
    const entries = readdirSync(dir);
    if (entries.includes('packages') || entries.includes('apps')) patterns.push('monorepo');
    if (entries.some(e => ['controllers', 'models', 'views'].includes(e))) patterns.push('mvc');
    if (entries.some(e => ['domain', 'application', 'infrastructure'].includes(e))) patterns.push('hexagonal');
    if (entries.some(e => ['features', 'modules'].includes(e))) patterns.push('feature-sliced');
    if (entries.includes('src') && entries.includes('tests')) patterns.push('src-tests-separation');
  } catch { /* ignore */ }
  return patterns;
}

function detectConfigFiles(dir: string): string[] {
  const known = [
    'tsconfig.json', 'package.json', 'bun.lockb', 'bun.lock',
    'pnpm-lock.yaml', 'yarn.lock', '.eslintrc.json', '.eslintrc.js',
    'jest.config.ts', 'vitest.config.ts', 'bunfig.toml',
    'Cargo.toml', 'go.mod', 'requirements.txt', 'pyproject.toml',
    '.github', 'Dockerfile', 'docker-compose.yml',
  ];
  try {
    const entries = readdirSync(dir);
    return known.filter(f => entries.includes(f));
  } catch { return []; }
}

function countFiles(dir: string): number {
  let count = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      count += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
    }
  } catch { /* ignore */ }
  return count;
}

function getCommitStats(repoPath: string, depth: number): { count: number; contributors: { author: string; count: number }[] } {
  try {
    const log = execSync(
      `git log --format="%an" -n ${depth}`,
      { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    if (!log) return { count: 0, contributors: [] };

    const authors = log.split('\n').filter(Boolean);
    const counts: Record<string, number> = {};
    for (const a of authors) counts[a] = (counts[a] || 0) + 1;
    const contributors = Object.entries(counts)
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { count: authors.length, contributors };
  } catch {
    return { count: 0, contributors: [] };
  }
}

function hasTestDir(dir: string): boolean {
  try {
    const entries = readdirSync(dir);
    return entries.some(e => ['tests', 'test', '__tests__', 'spec'].includes(e));
  } catch { return false; }
}

function hasCI(dir: string): boolean {
  return existsSync(join(dir, '.github', 'workflows')) || existsSync(join(dir, '.gitlab-ci.yml'));
}

function detectPackageManager(dir: string): string | null {
  if (existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock'))) return 'bun';
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(dir, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(dir, 'package-lock.json'))) return 'npm';
  if (existsSync(join(dir, 'Cargo.toml'))) return 'cargo';
  if (existsSync(join(dir, 'go.mod'))) return 'go';
  return null;
}

function urlToSlug(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\.git$/, '').replace(/[^a-zA-Z0-9-]/g, '-');
}

export async function mineRepo(url: string, options: RepoMineOptions = {}): Promise<RepoMineResult> {
  const { depth = 100, vibeDir = '.vibe', dryRun = false, skipClone = false, localPath } = options;
  const dbId = randomUUID();
  const clonedAt = new Date().toISOString();

  let repoPath: string;

  if (skipClone && localPath) {
    repoPath = localPath;
  } else {
    // Clone to a temp directory under vibeDir
    const cloneDir = join(vibeDir, 'repo-clones');
    if (!dryRun) await mkdir(cloneDir, { recursive: true });
    const slug = urlToSlug(url).slice(0, 50);
    repoPath = join(cloneDir, slug);
    if (!dryRun) {
      execSync(`git clone --depth ${depth} "${url}" "${repoPath}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300_000
      });
    }
  }

  const languages = detectLanguages(repoPath);
  const fileCount = countFiles(repoPath);
  const { count: commitCount, contributors: topContributors } = getCommitStats(repoPath, depth);
  const detectedPatterns = detectPatterns(repoPath);
  const configFiles = detectConfigFiles(repoPath);

  const analysis: RepoAnalysis = {
    url,
    clonedAt,
    languages,
    fileCount,
    commitCount,
    topContributors,
    hasTests: hasTestDir(repoPath),
    hasCI: hasCI(repoPath),
    packageManager: detectPackageManager(repoPath),
    detectedPatterns,
    configFiles,
  };

  let okfPath: string | null = null;
  let jsonlRecordsWritten = 0;

  if (!dryRun) {
    // Write OKF markdown
    const learningsDir = join(vibeDir, 'learnings');
    await mkdir(learningsDir, { recursive: true });
    const slug = urlToSlug(url).slice(0, 80);
    okfPath = join(learningsDir, `${slug}.md`);

    const topLangs = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang);

    const okfContent = `---
type: repo-learning
url: ${url}
mined_at: ${clonedAt}
languages: [${topLangs.join(', ')}]
patterns: [${detectedPatterns.join(', ')}]
commit_count: ${commitCount}
top_contributors: [${topContributors.slice(0, 3).map(c => c.author).join(', ')}]
---

# Repo Learning: ${url.split('/').slice(-2).join('/')}

## Architecture Patterns
${detectedPatterns.length ? detectedPatterns.map(p => `- ${p}`).join('\n') : '- No specific patterns detected'}

## Languages
${Object.entries(languages).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([lang, count]) => `- ${lang}: ${count} files`).join('\n')}

## Repository Signals
- File count: ${fileCount}
- Commit count: ${commitCount}
- Package manager: ${analysis.packageManager ?? 'unknown'}
- Has tests: ${analysis.hasTests}
- Has CI: ${analysis.hasCI}

## Key Config Files
${configFiles.length ? configFiles.map(f => `- ${f}`).join('\n') : '- None detected'}

## Top Contributors
${topContributors.slice(0, 5).map(c => `- ${c.author} (${c.count} commits)`).join('\n') || '- Unknown (shallow clone)'}
`;
    await writeFile(okfPath, okfContent, 'utf-8');

    // Write JSONL training record
    const jsonlPath = join(vibeDir, 'repo-learnings.jsonl');
    const record = {
      id: dbId,
      timestamp: clonedAt,
      type: 'repo_mining',
      metadata: {
        url,
        languages: topLangs,
        patterns: detectedPatterns,
        commitCount,
        fileCount,
        hasTests: analysis.hasTests,
        hasCI: analysis.hasCI,
        packageManager: analysis.packageManager,
        topContributors: topContributors.slice(0, 5),
      }
    };
    await appendFile(jsonlPath, JSON.stringify(record) + '\n', 'utf-8');
    jsonlRecordsWritten = 1;
  }

  return { url, dbId, analysis, okfPath, jsonlRecordsWritten };
}
