import { readdirSync, statSync } from 'fs';
import { basename, join } from 'path';

export interface FolderNode {
  name: string;
  type: 'file' | 'dir';
  children?: FolderNode[];
  language?: string;
  size?: number;
}

export interface FolderAnalysis {
  tree: FolderNode;
  languages: Record<string, number>;
  detectedPatterns: string[];
  testCoverage: 'present' | 'absent' | 'partial';
  configFiles: string[];
}

const EXT_MAP: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TSX', '.js': 'JavaScript', '.jsx': 'JSX',
  '.py': 'Python', '.rs': 'Rust', '.go': 'Go', '.rb': 'Ruby',
  '.java': 'Java', '.cs': 'C#', '.cpp': 'C++', '.c': 'C',
  '.swift': 'Swift', '.kt': 'Kotlin', '.vue': 'Vue', '.svelte': 'Svelte',
};

const CONFIG_FILES = [
  'tsconfig.json', 'package.json', 'bun.lockb', 'bun.lock',
  'pnpm-lock.yaml', 'yarn.lock', '.eslintrc.json', '.eslintrc.js',
  'jest.config.ts', 'vitest.config.ts', 'bunfig.toml',
  'Cargo.toml', 'go.mod', 'requirements.txt', 'pyproject.toml',
  '.github', 'Dockerfile', 'docker-compose.yml',
];

const SKIP = new Set(['node_modules', '.git', 'dist', '.vibe']);

export function analyzeFolder(repoPath: string): FolderAnalysis {
  const languages: Record<string, number> = {};
  const tree = buildTree(repoPath, repoPath, languages, 0);
  const entries = safeReaddir(repoPath);
  const detectedPatterns = detectPatterns(repoPath, entries);
  const configFiles = CONFIG_FILES.filter(f => entries.includes(f));
  const testCoverage = determineTestCoverage(repoPath, entries);
  return { tree, languages, detectedPatterns, testCoverage, configFiles };
}

function buildTree(
  rootPath: string,
  currentPath: string,
  langs: Record<string, number>,
  depth: number
): FolderNode {
  const name = currentPath === rootPath ? '.' : basename(currentPath);

  if (depth > 3) return { name, type: 'dir' };

  const rawEntries = safeReaddirWithTypes(currentPath);
  if (rawEntries === null) return { name, type: 'dir' };

  const children: FolderNode[] = [];
  for (const entry of rawEntries) {
    if (SKIP.has(entry.name)) continue;
    const fullPath = join(currentPath, entry.name);
    if (entry.isDirectory()) {
      children.push(buildTree(rootPath, fullPath, langs, depth + 1));
    } else {
      const ext = '.' + entry.name.split('.').pop()?.toLowerCase();
      const language = EXT_MAP[ext];
      if (language) langs[language] = (langs[language] || 0) + 1;
      let size: number | undefined;
      try { size = statSync(fullPath).size; } catch { /* ignore */ }
      children.push({ name: entry.name, type: 'file', language, size });
    }
  }
  return { name, type: 'dir', children };
}

function detectPatterns(repoPath: string, entries: string[]): string[] {
  const patterns: string[] = [];
  const combined = entries.includes('src')
    ? [...entries, ...safeReaddir(join(repoPath, 'src'))]
    : entries;
  if (combined.includes('packages') || combined.includes('apps')) patterns.push('monorepo');
  if (combined.some(e => ['controllers', 'models', 'views'].includes(e))) patterns.push('mvc');
  if (combined.some(e => ['domain', 'application', 'infrastructure'].includes(e))) patterns.push('hexagonal');
  if (combined.some(e => ['features', 'modules'].includes(e))) patterns.push('feature-sliced');
  if (entries.includes('src') && entries.includes('tests')) patterns.push('src-tests-separation');
  return patterns;
}

function determineTestCoverage(dir: string, entries: string[]): 'present' | 'absent' | 'partial' {
  const testDirName = entries.find(e => ['tests', 'test', '__tests__', 'spec'].includes(e));
  if (!testDirName) return 'absent';
  const testFiles = safeReaddir(join(dir, testDirName));
  return testFiles.length > 0 ? 'present' : 'partial';
}

function safeReaddir(dir: string): string[] {
  try { return readdirSync(dir); } catch { return []; }
}

function safeReaddirWithTypes(dir: string): import('fs').Dirent[] | null {
  try { return readdirSync(dir, { withFileTypes: true }) as import('fs').Dirent[]; } catch { return null; }
}
