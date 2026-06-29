import { writeFile, mkdir, appendFile } from 'fs/promises';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { execFileSync } from 'child_process';
import type { DatabaseConnection } from '../state/connection.js';
import { analyzeFolder, type FolderAnalysis } from './folder-analyzer.js';
import { analyzeCommits, type CommitAnalysis } from './commit-analyzer.js';

const ALLOWED_URL_PROTOCOLS = /^(https?:\/\/|git:\/\/|ssh:\/\/|git@|file:\/\/)/i;

function validateRepoUrl(url: string): void {
  if (!ALLOWED_URL_PROTOCOLS.test(url)) {
    throw new Error(`Unsupported repository URL scheme. Allowed: http, https, git, ssh, git@, file`);
  }
  if (url.startsWith('-')) {
    throw new Error('Repository URL must not start with a dash');
  }
}

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
  /** Structured commit analysis from commit-analyzer */
  commits: CommitAnalysis;
  /** Structured folder analysis from folder-analyzer */
  folder: FolderAnalysis;
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
  /** Optional DB connection to persist result to repo_analyses table */
  db?: DatabaseConnection;
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
  const { depth = 100, vibeDir = '.vibe', dryRun = false, skipClone = false, localPath, db } = options;

  validateRepoUrl(url);

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
      execFileSync('git', ['clone', '--depth', String(depth), '--', url, repoPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 300_000
      });
    }
  }

  const folderAnalysis = analyzeFolder(repoPath);
  const commitAnalysis = analyzeCommits(repoPath, depth);
  const languages = folderAnalysis.languages;
  const fileCount = countFiles(repoPath);
  const commitCount = commitAnalysis.totalCommits;
  const topContributors = commitAnalysis.topContributors;
  const detectedPatterns = folderAnalysis.detectedPatterns;
  const configFiles = folderAnalysis.configFiles;

  const analysis: RepoAnalysis = {
    url,
    clonedAt,
    languages,
    fileCount,
    commitCount,
    topContributors,
    hasTests: folderAnalysis.testCoverage !== 'absent',
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

    // Persist to repo_analyses SQLite table if a DB connection was provided
    if (db) {
      db.db.prepare(`
        INSERT OR REPLACE INTO repo_analyses
          (id, url, cloned_at, languages, folder_structure, commit_count,
           top_contributors, architecture_patterns, file_count, has_tests,
           has_ci, package_manager, okf_path, jsonl_path, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        dbId,
        url,
        clonedAt,
        JSON.stringify(analysis.languages),
        JSON.stringify({}),
        analysis.commitCount,
        JSON.stringify(analysis.topContributors),
        JSON.stringify(analysis.detectedPatterns),
        analysis.fileCount,
        analysis.hasTests ? 1 : 0,
        analysis.hasCI ? 1 : 0,
        analysis.packageManager,
        okfPath,
        jsonlPath,
        JSON.stringify({ configFiles: analysis.configFiles }),
      );
    }
  }

  return { url, dbId, analysis, commits: commitAnalysis, folder: folderAnalysis, okfPath, jsonlRecordsWritten };
}
