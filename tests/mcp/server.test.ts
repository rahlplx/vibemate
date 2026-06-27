import { describe, it, expect } from 'bun:test';
import { StackDetector } from '../../src/mcp/stack-detector.js';
import { specToolDefinition, specToolHandler, SpecInputSchema } from '../../src/mcp/tools/spec.js';

describe('MCP Components', () => {
  describe('StackDetector', () => {
    it('creates detector with default project root', () => {
      const detector = new StackDetector();
      expect(detector).toBeDefined();
      expect(typeof detector.detect).toBe('function');
    });

    it('creates detector with custom project root', () => {
      const detector = new StackDetector('/tmp/test');
      expect(detector).toBeDefined();
    });

    it('can set project root', () => {
      const detector = new StackDetector();
      detector.setProjectRoot('/tmp/new-root');
      expect(detector).toBeDefined();
    });
  });

  describe('Spec Tool Definition', () => {
    it('has correct tool name', () => {
      expect(specToolDefinition.name).toBe('vibemate_spec');
    });

    it('has description', () => {
      expect(specToolDefinition.description).toBeDefined();
      expect(specToolDefinition.description.length).toBeGreaterThan(0);
    });

    it('requires idea parameter', () => {
      expect(specToolDefinition.inputSchema.required).toContain('idea');
    });

    it('has idea property in schema', () => {
      const props = specToolDefinition.inputSchema.properties as Record<string, unknown>;
      expect(props.idea).toBeDefined();
      expect((props.idea as { type: string }).type).toBe('string');
    });
  });

  describe('Spec Tool Handler', () => {
    it('returns pending status for stub handler', async () => {
      const result = await specToolHandler({ idea: 'A test application for tracking tasks' });
      expect(result.content).toBeDefined();
      expect(result.content.length).toBe(1);
      expect(result.content[0].type).toBe('text');
    });

    it('includes structured content', async () => {
      const result = await specToolHandler({ idea: 'A test application for tracking tasks' });
      expect(result.structuredContent).toBeDefined();
    });
  });

  describe('Spec Input Schema', () => {
    it('validates valid input', () => {
      const result = SpecInputSchema.safeParse({ idea: 'A time-tracking app for freelancers' });
      expect(result.success).toBe(true);
    });

    it('rejects empty idea', () => {
      const result = SpecInputSchema.safeParse({ idea: '' });
      expect(result.success).toBe(false);
    });

    it('rejects short idea', () => {
      const result = SpecInputSchema.safeParse({ idea: 'short' });
      expect(result.success).toBe(false);
    });

    it('accepts optional stack override', () => {
      const result = SpecInputSchema.safeParse({ 
        idea: 'A time-tracking app for freelancers',
        stack: { framework: 'nextjs', language: 'typescript' }
      });
      expect(result.success).toBe(true);
    });
  });
});
