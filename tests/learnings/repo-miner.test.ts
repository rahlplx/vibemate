import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { mineRepo, type RepoMineOptions } from '../../src/learnings/repo-miner.js';
import { createConnection, closeConnection } from '../../src/state/connection.js';
import { runMigrations } from '../../src/state/migrations.js';

// Mock git operations so tests don't clone real repos
function createFakeRepo(dir: string): string {
  const repoDir = join(dir, 'fake-repo');
  mkdirSync(repoDir);
  mkdirSync(join(repoDir, 'src'));
  mkdirSync(join(repoDir, 'tests'));
  writeFileSync(join(repoDir, 'src', 'index.ts'), 'export const x = 1;');
  writeFileSync(join(repoDir, 'tests', 'index.test.ts'), 'import { x } from "../src/index"; assert(x === 1);');
  writeFileSync(join(repoDir, 'package.json'), JSON.stringify({ name: 'fake-repo', scripts: { test: 'bun test' } }));
  writeFileSync(join(repoDir, 'tsconfig.json'), '{}');
  return repoDir;
}

describe('mineRepo', () => {
  let tmpDir: string;
  let vibeDir: string;
  let repoPath: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'vibemate-mine-'));
    vibeDir = join(tmpDir, '.vibe');
    mkdirSync(vibeDir, { recursive: true });
    repoPath = createFakeRepo(tmpDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('analyzes a local directory and returns structured result', async () => {
    const result = await mineRepo('file://' + repoPath, {
      vibeDir,
      skipClone: true,         // test mode: skip actual git clone
      localPath: repoPath,
    } satisfies RepoMineOptions);

    expect(result.url).toBe('file://' + repoPath);
    expect(result.analysis).toBeDefined();
    expect(result.analysis.languages).toBeDefined();
    expect(result.dbId).toBeTruthy();
  });

  it('writes OKF markdown to vibeDir/learnings/', async () => {
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

  it('writes JSONL training records', async () => {
    const result = await mineRepo('file://' + repoPath, {
      vibeDir,
      skipClone: true,
      localPath: repoPath,
    });

    expect(result.jsonlRecordsWritten).toBeGreaterThan(0);
    const jsonlPath = join(vibeDir, 'repo-learnings.jsonl');
    expect(existsSync(jsonlPath)).toBe(true);

    const line = (await import('fs')).readFileSync(jsonlPath, 'utf-8').trim().split('\n')[0];
    const record = JSON.parse(line);
    expect(record.type).toBe('repo_mining');
    expect(record.metadata).toBeDefined();
  });

  it('dry-run skips all file writes', async () => {
    await mineRepo('file://' + repoPath, {
      vibeDir,
      skipClone: true,
      localPath: repoPath,
      dryRun: true,
    });

    const learningsDir = join(vibeDir, 'learnings');
    expect(existsSync(learningsDir)).toBe(false);
    const jsonlPath = join(vibeDir, 'repo-learnings.jsonl');
    expect(existsSync(jsonlPath)).toBe(false);
  });

  it('returns commit analysis with language detection', async () => {
    const result = await mineRepo('file://' + repoPath, {
      vibeDir,
      skipClone: true,
      localPath: repoPath,
    });

    expect(result.analysis.languages).toBeDefined();
    expect(typeof result.analysis.languages).toBe('object');
  });

  it('inserts row into repo_analyses when db option provided', async () => {
    const dbPath = join(tmpDir, 'test.db');
    const conn = createConnection(dbPath);
    runMigrations(conn);

    const result = await mineRepo('file://' + repoPath, {
      vibeDir,
      skipClone: true,
      localPath: repoPath,
      db: conn,
    });

    const row = conn.db.prepare('SELECT * FROM repo_analyses WHERE id = ?').get(result.dbId) as Record<string, unknown> | undefined;
    expect(row).toBeDefined();
    expect(row!.url).toBe('file://' + repoPath);
    expect(row!.file_count).toBeGreaterThan(0);
    expect(JSON.parse(row!.languages as string)).toBeDefined();
    closeConnection(conn);
  });
});
