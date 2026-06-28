import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { mineRepo } from '../../src/learnings/repo-miner.js';

function createFakeRepo(base: string): string {
  mkdirSync(join(base, 'src'), { recursive: true });
  mkdirSync(join(base, 'tests'), { recursive: true });
  writeFileSync(join(base, 'src', 'app.ts'), 'export const app = 1;');
  writeFileSync(join(base, 'tests', 'app.test.ts'), 'import { app } from "../src/app";');
  writeFileSync(join(base, 'package.json'), JSON.stringify({ name: 'fake' }));
  return base;
}

describe('mine command — mineRepo integration', () => {
  let tmpDir: string;
  let vibeDir: string;
  let repoPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vibemate-mine-cmd-'));
    vibeDir = join(tmpDir, '.vibe');
    mkdirSync(vibeDir, { recursive: true });
    repoPath = createFakeRepo(join(tmpDir, 'repo'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('dry-run skips all file writes', async () => {
    await mineRepo('file://' + repoPath, {
      vibeDir,
      skipClone: true,
      localPath: repoPath,
      dryRun: true,
    });

    expect(existsSync(join(vibeDir, 'learnings'))).toBe(false);
    expect(existsSync(join(vibeDir, 'repo-learnings.jsonl'))).toBe(false);
  });

  it('depth option is passed through and accepted', async () => {
    const result = await mineRepo('file://' + repoPath, {
      vibeDir,
      skipClone: true,
      localPath: repoPath,
      depth: 5,
    });
    expect(result).toBeDefined();
    expect(result.analysis).toBeDefined();
  });

  it('returns result with url, dbId, analysis fields', async () => {
    const url = 'file://' + repoPath;
    const result = await mineRepo(url, {
      vibeDir,
      skipClone: true,
      localPath: repoPath,
    });
    expect(result.url).toBe(url);
    expect(result.dbId).toBeTruthy();
    expect(result.analysis.languages).toBeDefined();
    expect(typeof result.analysis.fileCount).toBe('number');
    expect(Array.isArray(result.analysis.detectedPatterns)).toBe(true);
    expect(Array.isArray(result.analysis.configFiles)).toBe(true);
  });

  it('detects typescript files', async () => {
    const result = await mineRepo('file://' + repoPath, {
      vibeDir,
      skipClone: true,
      localPath: repoPath,
    });
    expect(result.analysis.languages['TypeScript']).toBeGreaterThan(0);
  });

  it('detects src-tests-separation pattern', async () => {
    const result = await mineRepo('file://' + repoPath, {
      vibeDir,
      skipClone: true,
      localPath: repoPath,
    });
    expect(result.analysis.detectedPatterns).toContain('src-tests-separation');
  });

  it('writes OKF markdown file', async () => {
    await mineRepo('file://' + repoPath, {
      vibeDir,
      skipClone: true,
      localPath: repoPath,
    });
    const learningsDir = join(vibeDir, 'learnings');
    expect(existsSync(learningsDir)).toBe(true);
    const files = (await import('fs')).readdirSync(learningsDir);
    expect(files.some(f => f.endsWith('.md'))).toBe(true);
  });

  it('rejects URLs without allowed scheme', async () => {
    await expect(
      mineRepo('ftp://example.com/repo', { vibeDir, skipClone: true, localPath: repoPath })
    ).rejects.toThrow(/Unsupported repository URL scheme/);
  });

  it('rejects URLs starting with dash', async () => {
    await expect(
      mineRepo('--bad-flag', { vibeDir, skipClone: true, localPath: repoPath })
    ).rejects.toThrow();
  });
});
