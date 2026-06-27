import { describe, it, expect, beforeAll } from 'bun:test';
import { createSpecGenerator, buildSystemPrompt, buildUserPrompt } from '../../src/mcp/tools/spec-generator.js';

describe('Anthropic SDK Integration', () => {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

  beforeAll(() => {
    if (!hasApiKey) {
      console.warn('ANTHROPIC_API_KEY not set - skipping live API tests');
    }
  });

  it('creates spec generator with API key', () => {
    const generator = createSpecGenerator({ apiKey: 'test-key' });
    expect(generator).toBeDefined();
    expect(typeof generator).toBe('function');
  });

  it('creates spec generator from environment', () => {
    const generator = createSpecGenerator({});
    expect(generator).toBeDefined();
  });

  it('creates spec generator with custom maxRetries', () => {
    const generator = createSpecGenerator({ apiKey: 'test-key', maxRetries: 5 });
    expect(generator).toBeDefined();
  });

  it('buildSystemPrompt returns valid prompt', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('product specification');
    expect(prompt).toContain('JSON');
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('buildUserPrompt includes idea', () => {
    const prompt = buildUserPrompt('A task management app', undefined);
    expect(prompt).toContain('A task management app');
  });

  it('buildUserPrompt includes stack context', () => {
    const prompt = buildUserPrompt('A task management app', {
      framework: 'nextjs',
      language: 'typescript'
    });
    expect(prompt).toContain('nextjs');
    expect(prompt).toContain('typescript');
  });

  // Live API test - only runs with real API key
  it.skipIf(!hasApiKey)('generates spec from real API call', async () => {
    const generator = createSpecGenerator({});
    const spec = await generator({ idea: 'A simple todo list app with user authentication' });
    
    expect(spec).toBeDefined();
    expect(spec.product).toBeDefined();
    expect(spec.product.name).toBeDefined();
    expect(spec.product.oneLiner).toBeDefined();
    expect(spec.personas).toBeDefined();
    expect(spec.personas.length).toBeGreaterThan(0);
    expect(spec.dataModel).toBeDefined();
    expect(spec.dataModel.entities.length).toBeGreaterThan(0);
  }, 30000); // 30 second timeout for API call

  // Retry logic test - verifies error handling
  it('throws error when API key is invalid', async () => {
    const generator = createSpecGenerator({ apiKey: 'invalid-key', maxRetries: 0 });
    
    await expect(
      generator({ idea: 'A simple todo list app' })
    ).rejects.toThrow();
  });
});
