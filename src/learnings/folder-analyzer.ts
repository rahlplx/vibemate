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
const TEST_DIR_NAMES = new Set(['tests', 'test', '__tests__', 'spec']);

export function analyzeFolder(repoPath: string): FolderAnalysis {
  const languages: Record<string, number> = {};
  const rootEntries: string[] = [];
  const tree = buildTree(repoPath, repoPath, languages, 0, rootEntries);
  const entrySet = new Set(rootEntries);
  const detectedPatterns = detectPatterns(repoPath, rootEntries, entrySet);
  // O(1) set lookups per config file instead of O(N) array scans
  const configFiles = CONFIG_FILES.filter(f => entrySet.has(f));
  const testCoverage = determineTestCoverage(repoPath, rootEntries);
  return { tree, languages, detectedPatterns, testCoverage, configFiles };
}

function buildTree(
  rootPath: string,
  currentPath: string,
  langs: Record<string, number>,
  depth: number,
  rootEntries?: string[]
): FolderNode {
  const name = currentPath === rootPath ? '.' : basename(currentPath);

  if (depth > 3) return { name, type: 'dir' };

  const rawEntries = safeReaddirWithTypes(currentPath);
  if (rawEntries === null) return { name, type: 'dir' };

  const children: FolderNode[] = [];
  for (let i = 0; i < rawEntries.length; i++) {
    const entry = rawEntries[i];
    if (depth === 0 && rootEntries) {
      rootEntries.push(entry.name);
    }
    if (SKIP.has(entry.name)) continue;
    const fullPath = join(currentPath, entry.name);
    if (entry.isDirectory()) {
      children.push(buildTree(rootPath, fullPath, langs, depth + 1));
    } else {
      // Use lastIndexOf to extract extension without array allocations from string splitting
      const dotIdx = entry.name.lastIndexOf('.');
      const ext = dotIdx !== -1 ? entry.name.slice(dotIdx).toLowerCase() : '';
      const language = EXT_MAP[ext];
      if (language) langs[language] = (langs[language] || 0) + 1;
      let size: number | undefined;
      try { size = statSync(fullPath).size; } catch { /* ignore */ }
      children.push({ name: entry.name, type: 'file', language, size });
    }
  }
  return { name, type: 'dir', children };
}

function detectPatterns(repoPath: string, entries: string[], entrySet: Set<string>): string[] {
  const patterns: string[] = [];
  let combinedSet = entrySet;

  if (entrySet.has('src')) {
    const srcEntries = safeReaddir(join(repoPath, 'src'));
    combinedSet = new Set([...entries, ...srcEntries]);
  }

  // O(1) set checks instead of intermediate array allocations and O(N) scans
  if (combinedSet.has('packages') || combinedSet.has('apps')) patterns.push('monorepo');
  if (combinedSet.has('controllers') || combinedSet.has('models') || combinedSet.has('views')) patterns.push('mvc');
  if (combinedSet.has('domain') || combinedSet.has('application') || combinedSet.has('infrastructure')) patterns.push('hexagonal');
  if (combinedSet.has('features') || combinedSet.has('modules')) patterns.push('feature-sliced');
  if (entrySet.has('src') && entrySet.has('tests')) patterns.push('src-tests-separation');

  return patterns;
}

function determineTestCoverage(dir: string, entries: string[]): 'present' | 'absent' | 'partial' {
  let testDirName: string | undefined;
  for (let i = 0; i < entries.length; i++) {
    if (TEST_DIR_NAMES.has(entries[i])) {
      testDirName = entries[i];
      break;
    }
  }
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
