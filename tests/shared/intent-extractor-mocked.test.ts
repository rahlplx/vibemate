import { describe, it, expect, mock } from 'bun:test';

// Mock MUST be set up before importing the module under test
let mockReturnText = '';

mock.module('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: async () => ({
        content: [{ type: 'text', text: mockReturnText }]
      })
    }
  }
}));

const { createIntentExtractor } = await import('../../src/shared/intent-extractor.js');

describe('createIntentExtractor (mocked SDK)', () => {
  it('returns unknown when LLM response has no JSON', async () => {
    mockReturnText = 'no json block here';
    const extractor = createIntentExtractor('fake-key');
    const intent = await extractor.extract('build a login page');
    expect(intent.action).toBe('unknown');
    expect(intent.confidence).toBe(0.1);
    expect(intent.reasoning).toBe('Could not parse LLM response');
  });

  it('returns unknown when JSON does not match schema', async () => {
    mockReturnText = '{"action": "notvalid", "target": "x", "confidence": 0.5, "reasoning": "r", "context": {"urgency": "low", "scope": "file", "complexity": "simple"}}';
    const extractor = createIntentExtractor('fake-key');
    const intent = await extractor.extract('some input');
    expect(intent.action).toBe('unknown');
    expect(intent.reasoning).toBe('Invalid JSON in LLM response');
  });

  it('returns parsed intent when LLM returns valid JSON', async () => {
    mockReturnText = JSON.stringify({
      action: 'fix', target: 'auth module', confidence: 0.88,
      reasoning: 'User wants to fix auth',
      context: { urgency: 'high', scope: 'module', complexity: 'moderate' }
    });
    const extractor = createIntentExtractor('fake-key');
    const intent = await extractor.extract('fix the auth module');
    expect(intent.action).toBe('fix');
    expect(intent.target).toBe('auth module');
    expect(intent.confidence).toBe(0.88);
  });

  it('handles non-text content type from LLM', async () => {
    mock.module('@anthropic-ai/sdk', () => ({
      default: class MockAnthropic {
        messages = {
          create: async () => ({ content: [{ type: 'image', source: {} }] })
        }
      }
    }));
    const { createIntentExtractor: fresh } = await import('../../src/shared/intent-extractor.js');
    const extractor = fresh('fake-key');
    const intent = await extractor.extract('do something');
    expect(intent.action).toBe('unknown');
  });
});
