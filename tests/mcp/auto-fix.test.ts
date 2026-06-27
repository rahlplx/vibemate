import { describe, it, expect } from 'bun:test';
import { createAutoFix, type FixIssue, type FixResult } from '../../src/mcp/tools/auto-fix.js';

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
