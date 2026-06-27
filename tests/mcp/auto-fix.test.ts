import { describe, it, expect } from 'bun:test';
import {
  createAutoFix,
  autoFixToolDefinition,
  autoFixToolHandler,
  type FixIssue,
} from '../../src/mcp/tools/auto-fix.js';

describe('createAutoFix', () => {
  it('returns an auto-fix instance', () => {
    const af = createAutoFix();
    expect(af).toBeDefined();
    expect(typeof af.scan).toBe('function');
    expect(typeof af.fix).toBe('function');
    expect(typeof af.dryRun).toBe('function');
    expect(typeof af.getCategories).toBe('function');
  });

  it('getCategories returns known categories', () => {
    const af = createAutoFix();
    const cats = af.getCategories();
    expect(cats).toContain('config');
    expect(cats).toContain('dependency');
    expect(cats).toContain('security');
    expect(cats).toContain('project');
  });

  it('scan returns an array', async () => {
    const af = createAutoFix();
    const issues = await af.scan();
    expect(Array.isArray(issues)).toBe(true);
  });

  it('scan returns issues sorted by severity', async () => {
    const af = createAutoFix();
    const issues = await af.scan();
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    for (let i = 1; i < issues.length; i++) {
      expect(order[issues[i].severity]).toBeGreaterThanOrEqual(order[issues[i - 1].severity]);
    }
  });

  it('dryRun returns skipped results', async () => {
    const af = createAutoFix();
    const issues: FixIssue[] = [
      { id: 'test-1', type: 'config', severity: 'low', description: 'Test', fix: 'Fix it', file: 'test.txt' },
    ];
    const results = await af.dryRun(issues);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('skipped');
    expect(results[0].preview).toBe(true);
    expect(results[0].file).toBe('test.txt');
  });

  it('fix returns success for issues with apply functions', async () => {
    const af = createAutoFix();
    const issues: FixIssue[] = [
      { id: 'missing-env', type: 'config', severity: 'high', description: 'Missing .env', fix: 'Create .env', file: '.env' },
    ];
    const results = await af.fix(issues);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('success');
  });

  it('fix returns skipped for issues without apply functions', async () => {
    const af = createAutoFix();
    const issues: FixIssue[] = [
      { id: 'node-modules-check', type: 'dependency', severity: 'high', description: 'node_modules missing', fix: 'Run install' },
    ];
    const results = await af.fix(issues);
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('skipped');
  });
});

describe('autoFixToolDefinition', () => {
  it('has correct name', () => {
    expect(autoFixToolDefinition.name).toBe('vibemate_fix');
  });

  it('has description', () => {
    expect(autoFixToolDefinition.description.length).toBeGreaterThan(0);
  });

  it('has input schema', () => {
    const schema = autoFixToolDefinition.inputSchema as { properties: Record<string, unknown> };
    expect(schema.properties.scan).toBeDefined();
    expect(schema.properties.fix).toBeDefined();
    expect(schema.properties.dryRun).toBeDefined();
  });
});

describe('autoFixToolHandler', () => {
  it('scan mode returns issues', async () => {
    const result = await autoFixToolHandler({ scan: true });
    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain('Found');
    expect(result.content[0].text).toContain('issues');
  });

  it('no action returns help message', async () => {
    const result = await autoFixToolHandler({});
    expect(result.content[0].text).toContain('No action specified');
  });

  it('fix mode processes issues with apply functions', async () => {
    const issues: FixIssue[] = [
      { id: 'missing-env', type: 'config', severity: 'high', description: 'Missing .env', fix: 'Create .env', file: '.env' },
    ];
    const result = await autoFixToolHandler({ fix: issues });
    expect(result.content[0].text).toContain('Fix results');
    expect(result.content[0].text).toContain('SUCCESS');
  });

  it('dryRun mode shows preview', async () => {
    const issues: FixIssue[] = [
      { id: 'test-dry', type: 'config', severity: 'low', description: 'Test', fix: 'Fix it' },
    ];
    const result = await autoFixToolHandler({ fix: issues, dryRun: true });
    expect(result.content[0].text).toContain('Fix results');
    expect(result.content[0].text).toContain('SKIPPED');
  });

  it('scan returns structured content', async () => {
    const result = await autoFixToolHandler({ scan: true });
    expect(result.structuredContent).toBeDefined();
    expect(Array.isArray(result.structuredContent)).toBe(true);
  });
});
