import { describe, it, expect, mock } from 'bun:test';

// State shared between mock and tests — mutated per test
const mockState = {
  responseContent: [{ type: 'text', text: '{}' }] as Array<{ type: string; text?: string }>,
  callCount: 0,
  shouldThrow: false,
};

mock.module('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = {
      create: async () => {
        mockState.callCount++;
        if (mockState.shouldThrow) throw new Error('API error');
        return { content: mockState.responseContent };
      },
    };
  },
}));

const { createSpecGenerator } = await import('../../src/mcp/tools/spec-generator.js');

const validSpec = {
  product: { name: 'Test', oneLiner: 'A test', problem: 'Problem', solution: 'Solution' },
  personas: [],
  userFlows: [],
  dataModel: { entities: [], relationships: [] },
  apiContract: { style: 'rest' as const, endpoints: [] },
  techStack: { layers: [], justification: 'Just testing' },
  fileStructure: [],
  milestones: [],
  risks: [],
};

describe('createSpecGenerator (mocked SDK)', () => {
  it('throws when no apiKey is provided', async () => {
    const generateSpec = createSpecGenerator({});
    await expect(generateSpec({ idea: 'A test app idea for testing purposes' })).rejects.toThrow('ANTHROPIC_API_KEY is required');
  });

  it('throws on non-text content type from LLM', async () => {
    mockState.responseContent = [{ type: 'image' }];
    mockState.shouldThrow = false;
    const generateSpec = createSpecGenerator({ apiKey: 'test-key', maxRetries: 0 });
    await expect(generateSpec({ idea: 'A test app idea for testing purposes' })).rejects.toThrow('Unexpected response type');
  });

  it('throws when LLM returns invalid JSON text', async () => {
    mockState.responseContent = [{ type: 'text', text: 'not valid json {{{' }];
    mockState.shouldThrow = false;
    const generateSpec = createSpecGenerator({ apiKey: 'test-key', maxRetries: 0 });
    await expect(generateSpec({ idea: 'A test app idea for testing purposes' })).rejects.toThrow('Failed to parse LLM response as JSON');
  });

  it('throws when JSON does not match SpecOutputSchema', async () => {
    mockState.responseContent = [{ type: 'text', text: '{"product": "bad"}' }];
    mockState.shouldThrow = false;
    const generateSpec = createSpecGenerator({ apiKey: 'test-key', maxRetries: 0 });
    await expect(generateSpec({ idea: 'A test app idea for testing purposes' })).rejects.toThrow('Invalid spec output');
  });

  it('returns valid SpecOutput when LLM returns correct JSON', async () => {
    mockState.responseContent = [{ type: 'text', text: JSON.stringify(validSpec) }];
    mockState.shouldThrow = false;
    const generateSpec = createSpecGenerator({ apiKey: 'test-key', maxRetries: 0 });
    const result = await generateSpec({ idea: 'A test app idea for testing purposes' });
    expect(result.product.name).toBe('Test');
    expect(result.apiContract.style).toBe('rest');
  });

  it('passes stackContext when stackProfile is provided', async () => {
    mockState.responseContent = [{ type: 'text', text: JSON.stringify(validSpec) }];
    mockState.shouldThrow = false;
    const generateSpec = createSpecGenerator({ apiKey: 'test-key', maxRetries: 0 });
    const stackProfile = {
      framework: 'nextjs',
      language: 'typescript',
      packageManager: 'npm',
      hasDatabase: true,
      database: 'postgres',
      hasTesting: true,
      hasCI: false,
      configFiles: [],
      dependencies: [],
      devDependencies: [],
    };
    const result = await generateSpec({ idea: 'A test app idea for testing purposes' }, stackProfile);
    expect(result.product.name).toBe('Test');
  });

  it('retries on failure and then throws after maxRetries exhausted', async () => {
    mockState.shouldThrow = true;
    mockState.callCount = 0;
    const generateSpec = createSpecGenerator({ apiKey: 'test-key', maxRetries: 1 });
    await expect(generateSpec({ idea: 'A test app idea for testing purposes' })).rejects.toThrow('API error');
    // Should have been called 2 times (attempt 0 + attempt 1)
    expect(mockState.callCount).toBe(2);
  }, 5000);
});
