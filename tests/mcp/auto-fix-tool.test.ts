import { describe, it, expect } from 'bun:test';
import { autoFixToolDefinition, autoFixToolHandler } from '../../src/mcp/tools/auto-fix.js';

describe('AutoFix MCP Tool', () => {
  describe('Tool Definition', () => {
    it('has correct tool name', () => {
      expect(autoFixToolDefinition.name).toBe('vibemate_fix');
    });

    it('has description', () => {
      expect(autoFixToolDefinition.description).toBeTruthy();
      expect(autoFixToolDefinition.description.length).toBeGreaterThan(10);
    });

    it('has inputSchema with scan and fix parameters', () => {
      const schema = autoFixToolDefinition.inputSchema;
      expect(schema.properties.scan).toBeDefined();
      expect(schema.properties.fix).toBeDefined();
      expect(schema.properties.dryRun).toBeDefined();
    });
  });

  describe('Tool Handler', () => {
    it('scans for issues when scan=true', async () => {
      const result = await autoFixToolHandler({ scan: true });
      expect(result.content).toBeDefined();
      const text = result.content[0].text;
      expect(text).toContain('issues');
    });

    it('returns structured data in response', async () => {
      const result = await autoFixToolHandler({ scan: true });
      expect(result.structuredContent).toBeDefined();
    });

    it('returns empty report for empty fix list', async () => {
      const result = await autoFixToolHandler({ fix: [] });
      expect(result.content).toBeDefined();
    });

    it('handles dryRun parameter', async () => {
      const result = await autoFixToolHandler({
        scan: false,
        fix: [{ id: 'test', type: 'config', severity: 'low', description: 'test', fix: 'test' }],
        dryRun: true,
      });
      expect(result.content).toBeDefined();
    });
  });
});
