import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { analyzeFolder, type FolderAnalysis, type FolderNode } from '../../src/learnings/folder-analyzer.js';

function createTestRepo(base: string): string {
  mkdirSync(join(base, 'src'), { recursive: true });
  mkdirSync(join(base, 'tests'), { recursive: true });
  mkdirSync(join(base, 'packages'), { recursive: true });
  writeFileSync(join(base, 'src', 'index.ts'), 'export const x = 1;');
  writeFileSync(join(base, 'src', 'util.ts'), 'export const y = 2;');
  writeFileSync(join(base, 'tests', 'index.test.ts'), 'import { x } from "../src/index";');
  writeFileSync(join(base, 'package.json'), JSON.stringify({ name: 'test' }));
  writeFileSync(join(base, 'tsconfig.json'), '{}');
  return base;
}

describe('analyzeFolder', () => {
  let tmpDir: string;
  let repoDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vibemate-folder-'));
    repoDir = tmpDir;
    createTestRepo(repoDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns a FolderAnalysis with all required fields', () => {
    const result = analyzeFolder(repoDir);
    expect(result).toHaveProperty('tree');
    expect(result).toHaveProperty('languages');
    expect(result).toHaveProperty('detectedPatterns');
    expect(result).toHaveProperty('testCoverage');
    expect(result).toHaveProperty('configFiles');
  });

  it('detects TypeScript files in languages map', () => {
    const result = analyzeFolder(repoDir);
    expect(result.languages['TypeScript']).toBeGreaterThan(0);
  });

  it('detects src-tests-separation pattern', () => {
    const result = analyzeFolder(repoDir);
    expect(result.detectedPatterns).toContain('src-tests-separation');
  });

  it('detects monorepo pattern when packages/ exists', () => {
    const result = analyzeFolder(repoDir);
    expect(result.detectedPatterns).toContain('monorepo');
  });

  it('detects config files present at root', () => {
    const result = analyzeFolder(repoDir);
    expect(result.configFiles).toContain('package.json');
    expect(result.configFiles).toContain('tsconfig.json');
  });

  it('reports testCoverage as present when tests/ has files', () => {
    const result = analyzeFolder(repoDir);
    expect(result.testCoverage).toBe('present');
  });

  it('reports testCoverage as absent when no test dir', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'vibemate-notest-'));
    writeFileSync(join(emptyDir, 'index.ts'), 'export const z = 3;');
    try {
      const result = analyzeFolder(emptyDir);
      expect(result.testCoverage).toBe('absent');
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('tree root node has type dir', () => {
    const result = analyzeFolder(repoDir);
    expect(result.tree.type).toBe('dir');
  });

  it('tree children include detected subdirectories', () => {
    const result = analyzeFolder(repoDir);
    const names = (result.tree.children ?? []).map((c: FolderNode) => c.name);
    expect(names).toContain('src');
    expect(names).toContain('tests');
  });

  it('handles non-existent directory gracefully', () => {
    const result = analyzeFolder('/non/existent/path/xyz');
    expect(result.languages).toEqual({});
    expect(result.detectedPatterns).toEqual([]);
    expect(result.configFiles).toEqual([]);
    expect(result.testCoverage).toBe('absent');
  });
});
