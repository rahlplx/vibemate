import { describe, it, expect } from 'bun:test';
import { autoCompleteToolDefinition, autoCompleteToolHandler } from '../../src/mcp/tools/auto-complete.js';

describe('AutoComplete MCP Tool', () => {
  describe('Tool Definition', () => {
    it('has correct tool name', () => {
      expect(autoCompleteToolDefinition.name).toBe('vibemate_suggest');
    });

    it('has description', () => {
      expect(autoCompleteToolDefinition.description).toBeTruthy();
      expect(autoCompleteToolDefinition.description.length).toBeGreaterThan(10);
    });

    it('has inputSchema with query parameter', () => {
      const schema = autoCompleteToolDefinition.inputSchema;
      expect(schema.properties.query).toBeDefined();
      expect(schema.properties.query.type).toBe('string');
    });

    it('has optional context parameter', () => {
      const schema = autoCompleteToolDefinition.inputSchema;
      expect(schema.properties.context).toBeDefined();
      expect(schema.properties.context.type).toBe('object');
    });

    it('query is required', () => {
      const schema = autoCompleteToolDefinition.inputSchema;
      expect(schema.required).toContain('query');
    });
  });

  describe('Tool Handler', () => {
    it('returns suggestions for valid input', async () => {
      const result = await autoCompleteToolHandler({ query: 'auth' });
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      const text = result.content[0].text;
      expect(text).toContain('Authentication');
    });

    it('returns trending for empty query', async () => {
      const result = await autoCompleteToolHandler({ query: '' });
      expect(result.content).toBeDefined();
    });

    it('handles context parameter', async () => {
      const result = await autoCompleteToolHandler({
        query: 'todo',
        context: { idea: 'a todo app', stack: 'nextjs' },
      });
      expect(result.content).toBeDefined();
    });

    it('includes structured data in response', async () => {
      const result = await autoCompleteToolHandler({ query: 'payment' });
      expect(result.structuredContent).toBeDefined();
      expect(Array.isArray(result.structuredContent)).toBe(true);
    });

    it('returns content with text field', async () => {
      const result = await autoCompleteToolHandler({ query: 'api' });
      for (const item of result.content) {
        expect(item.type).toBe('text');
        expect(typeof item.text).toBe('string');
      }
    });
  });
});
