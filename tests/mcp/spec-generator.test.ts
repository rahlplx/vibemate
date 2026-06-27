import { describe, it, expect } from 'bun:test';
import { buildSystemPrompt, buildUserPrompt, StackContext } from '../../src/mcp/tools/spec-generator.js';

describe('Spec Generator Prompts', () => {
  const mockStack: StackContext = {
    framework: 'nextjs',
    language: 'typescript',
    packageManager: 'npm',
    hasDatabase: true,
    database: 'postgres'
  };

  describe('buildSystemPrompt', () => {
    it('returns a string prompt', () => {
      const prompt = buildSystemPrompt();
      expect(typeof prompt).toBe('string');
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('includes role definition', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('product specification');
    });

    it('includes output format instructions', () => {
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('JSON');
    });
  });

  describe('buildUserPrompt', () => {
    it('includes the idea', () => {
      const prompt = buildUserPrompt('A time-tracking app for freelancers', undefined);
      expect(prompt).toContain('A time-tracking app for freelancers');
    });

    it('includes stack context when provided', () => {
      const prompt = buildUserPrompt('A time-tracking app', mockStack);
      expect(prompt).toContain('nextjs');
      expect(prompt).toContain('typescript');
    });

    it('works without stack context', () => {
      const prompt = buildUserPrompt('A time-tracking app', undefined);
      expect(prompt).toContain('A time-tracking app');
    });
  });
});
