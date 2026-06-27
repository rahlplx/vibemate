import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { createAutoFix, type FixIssue, type FixResult } from '../../src/mcp/tools/auto-fix.js';
import { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync, mkdirSync as mkDirSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('AutoFix', () => {
  const af = createAutoFix();

  describe('scan', () => {
    it('returns array of issues', async () => {
      const issues = await af.scan();
      expect(Array.isArray(issues)).toBe(true);
    });

    it('each issue has required fields', async () => {
      const issues = await af.scan();
      for (const issue of issues) {
        expect(issue.type).toBeDefined();
        expect(issue.severity).toBeDefined();
        expect(issue.description).toBeDefined();
        expect(issue.fix).toBeDefined();
        expect(['config', 'dependency', 'security', 'project']).toContain(issue.type);
        expect(['critical', 'high', 'medium', 'low']).toContain(issue.severity);
      }
    });

    it('includes file path for file-related issues', async () => {
      const issues = await af.scan();
      const fileIssues = issues.filter((i) => i.file);
      for (const issue of fileIssues) {
        expect(typeof issue.file).toBe('string');
      }
    });
  });

  describe('fix', () => {
    it('returns fix results for valid issues', async () => {
      const results = await af.fix([{ id: 'missing-env', type: 'config', severity: 'medium', description: 'Missing .env file', fix: 'Create .env from .env.example', file: '.env' }]);
      expect(Array.isArray(results)).toBe(true);
    });

    it('each fix result has status', async () => {
      const results = await af.fix([{ id: 'test-fix', type: 'project', severity: 'low', description: 'Test fix', fix: 'Do something' }]);
      for (const r of results) {
        expect(['success', 'failed', 'skipped']).toContain(r.status);
      }
    });

    it('creates backup before applying fix', async () => {
      const results = await af.fix([{ id: 'backup-test', type: 'config', severity: 'low', description: 'Backup test', fix: 'Test', file: 'test.txt' }]);
      for (const r of results) {
        if (r.status === 'success' && r.file) {
          expect(r.backup).toBeDefined();
        }
      }
    });

    it('actually applies the fix and creates the file', async () => {
      const testDir = join(tmpdir(), `vibemate-fix-test-${Date.now()}`);
      mkDirSync(testDir, { recursive: true });
      const fixer = createAutoFix(testDir);

      try {
        const results = await fixer.fix([{
          id: 'missing-env',
          type: 'config',
          severity: 'high',
          description: 'No .env file found',
          fix: 'Create .env',
          file: '.env'
        }]);
        expect(results[0].status).toBe('success');
        expect(existsSync(join(testDir, '.env'))).toBe(true);
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('creates .gitignore with standard patterns', async () => {
      const testDir = join(tmpdir(), `vibemate-gitignore-test-${Date.now()}`);
      mkDirSync(testDir, { recursive: true });
      const fixer = createAutoFix(testDir);

      try {
        const results = await fixer.fix([{
          id: 'missing-gitignore',
          type: 'config',
          severity: 'high',
          description: 'No .gitignore file',
          fix: 'Create .gitignore',
          file: '.gitignore'
        }]);
        expect(results[0].status).toBe('success');
        expect(existsSync(join(testDir, '.gitignore'))).toBe(true);
        const content = readFileSync(join(testDir, '.gitignore'), 'utf-8');
        expect(content).toContain('node_modules');
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('enables strict mode in tsconfig.json', async () => {
      const testDir = join(tmpdir(), `vibemate-tsconfig-test-${Date.now()}`);
      mkDirSync(testDir, { recursive: true });
      writeFileSync(join(testDir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022' } }, null, 2));
      const fixer = createAutoFix(testDir);

      try {
        const results = await fixer.fix([{
          id: 'typescript-no-strict',
          type: 'config',
          severity: 'medium',
          description: 'TypeScript strict mode not enabled',
          fix: 'Set strict: true',
          file: 'tsconfig.json'
        }]);
        expect(results[0].status).toBe('success');
        const content = readFileSync(join(testDir, 'tsconfig.json'), 'utf-8');
        expect(content).toContain('"strict": true');
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });

    it('skips issues without apply function', async () => {
      const results = await af.fix([{
        id: 'node-modules-check',
        type: 'dependency',
        severity: 'high',
        description: 'node_modules missing',
        fix: 'Run install'
      }]);
      expect(results[0].status).toBe('skipped');
    });

    it('returns failed for issues that throw during apply', async () => {
      const testDir = join(tmpdir(), `vibemate-fail-test-${Date.now()}`);
      mkDirSync(testDir, { recursive: true });
      const fixer = createAutoFix(testDir);

      try {
        // typescript-no-strict needs a tsconfig.json to exist
        const results = await fixer.fix([{
          id: 'typescript-no-strict',
          type: 'config',
          severity: 'medium',
          description: 'TypeScript strict mode not enabled',
          fix: 'Set strict: true',
          file: 'tsconfig.json'
        }]);
        expect(results[0].status).toBe('failed');
        expect(results[0].error).toBeDefined();
      } finally {
        rmSync(testDir, { recursive: true, force: true });
      }
    });
  });

  describe('dryRun', () => {
    it('shows what would be fixed without applying', async () => {
      const preview = await af.dryRun([{ id: 'dry-test', type: 'project', severity: 'low', description: 'Dry run test', fix: 'Would fix this' }]);
      expect(Array.isArray(preview)).toBe(true);
      for (const p of preview) {
        expect(p.preview).toBe(true);
      }
    });
  });

  describe('categories', () => {
    it('has all required categories', () => {
      const cats = af.getCategories();
      expect(cats).toContain('config');
      expect(cats).toContain('dependency');
      expect(cats).toContain('security');
      expect(cats).toContain('project');
    });
  });
});
