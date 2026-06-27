import { describe, it, expect } from 'bun:test';
import { SpecInputSchema, SpecOutputSchema, specToolDefinition, createSpecToolHandler, specToolHandler } from '../../src/mcp/tools/spec.js';
import { buildSystemPrompt, buildUserPrompt, createSpecGenerator } from '../../src/mcp/tools/spec-generator.js';
import type { SpecOutput } from '../../src/mcp/tools/spec.js';

describe('buildSystemPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildSystemPrompt();
    expect(prompt.length).toBeGreaterThan(0);
  });

  it('includes JSON schema structure', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('product');
    expect(prompt).toContain('personas');
    expect(prompt).toContain('dataModel');
    expect(prompt).toContain('apiContract');
    expect(prompt).toContain('techStack');
    expect(prompt).toContain('milestones');
    expect(prompt).toContain('risks');
  });

  it('includes stack context instruction', () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain('Stack Context');
  });
});

describe('buildUserPrompt', () => {
  it('includes the idea', () => {
    const prompt = buildUserPrompt('A time-tracking app');
    expect(prompt).toContain('A time-tracking app');
  });

  it('includes stack context when provided', () => {
    const prompt = buildUserPrompt('A time-tracking app', {
      framework: 'Next.js',
      language: 'TypeScript',
      packageManager: 'npm',
      hasDatabase: true,
      database: 'postgres',
    });
    expect(prompt).toContain('Next.js');
    expect(prompt).toContain('TypeScript');
    expect(prompt).toContain('npm');
    expect(prompt).toContain('postgres');
  });

  it('omits stack context when not provided', () => {
    const prompt = buildUserPrompt('A time-tracking app');
    expect(prompt).not.toContain('Technology Stack Context');
  });

  it('omits database when not detected', () => {
    const prompt = buildUserPrompt('A time-tracking app', {
      framework: 'Next.js',
    });
    expect(prompt).not.toContain('Database');
  });
});

describe('SpecInputSchema', () => {
  it('accepts valid input', () => {
    const result = SpecInputSchema.safeParse({
      idea: 'A time-tracking app for freelancers with invoicing',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty idea', () => {
    const result = SpecInputSchema.safeParse({ idea: '' });
    expect(result.success).toBe(false);
  });

  it('rejects idea < 10 chars', () => {
    const result = SpecInputSchema.safeParse({ idea: 'short' });
    expect(result.success).toBe(false);
  });

  it('accepts input with stack override', () => {
    const result = SpecInputSchema.safeParse({
      idea: 'A time-tracking app for freelancers with invoicing',
      stack: {
        framework: 'Next.js',
        language: 'TypeScript',
        packageManager: 'npm',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts input with partial stack', () => {
    const result = SpecInputSchema.safeParse({
      idea: 'A time-tracking app for freelancers with invoicing',
      stack: { framework: 'Next.js' },
    });
    expect(result.success).toBe(true);
  });
});

describe('SpecOutputSchema', () => {
  it('accepts valid output', () => {
    const result = SpecOutputSchema.safeParse({
      product: {
        name: 'TimeTracker',
        oneLiner: 'Track time, get paid',
        problem: 'Freelancers struggle with time tracking',
        solution: 'Simple time tracking with invoicing',
      },
      personas: [],
      userFlows: [],
      dataModel: { entities: [], relationships: [] },
      apiContract: { style: 'rest', endpoints: [] },
      techStack: { layers: [], justification: 'Modern stack' },
      fileStructure: [],
      milestones: [],
      risks: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects output missing product', () => {
    const result = SpecOutputSchema.safeParse({
      personas: [],
      userFlows: [],
      dataModel: { entities: [], relationships: [] },
      apiContract: { style: 'rest', endpoints: [] },
      techStack: { layers: [], justification: '' },
      fileStructure: [],
      milestones: [],
      risks: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid risk category', () => {
    const result = SpecOutputSchema.safeParse({
      product: { name: 'X', oneLiner: 'X', problem: 'X', solution: 'X' },
      personas: [],
      userFlows: [],
      dataModel: { entities: [], relationships: [] },
      apiContract: { style: 'rest', endpoints: [] },
      techStack: { layers: [], justification: '' },
      fileStructure: [],
      milestones: [],
      risks: [{ category: 'invalid', severity: 'high', description: 'X', mitigation: 'X' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid API style', () => {
    const result = SpecOutputSchema.safeParse({
      product: { name: 'X', oneLiner: 'X', problem: 'X', solution: 'X' },
      personas: [],
      userFlows: [],
      dataModel: { entities: [], relationships: [] },
      apiContract: { style: 'graphql', endpoints: [] },
      techStack: { layers: [], justification: '' },
      fileStructure: [],
      milestones: [],
      risks: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('specToolDefinition', () => {
  it('has correct name', () => {
    expect(specToolDefinition.name).toBe('vibemate_spec');
  });

  it('has description', () => {
    expect(specToolDefinition.description.length).toBeGreaterThan(0);
  });

  it('has input schema with required fields', () => {
    const schema = specToolDefinition.inputSchema as { properties: Record<string, unknown>; required: string[] };
    expect(schema.properties.idea).toBeDefined();
    expect(schema.required).toContain('idea');
  });
});

describe('createSpecToolHandler', () => {
  it('throws for invalid input', async () => {
    const handler = createSpecToolHandler(async () => ({} as SpecOutput));
    await expect(handler({ idea: '' })).rejects.toThrow();
  });

  it('calls generateSpec with parsed input', async () => {
    let calledWith: unknown = null;
    const handler = createSpecToolHandler(async (input) => {
      calledWith = input;
      return {
        product: { name: 'Test', oneLiner: 'Test', problem: 'Test', solution: 'Test' },
        personas: [],
        userFlows: [],
        dataModel: { entities: [], relationships: [] },
        apiContract: { style: 'rest', endpoints: [] },
        techStack: { layers: [], justification: '' },
        fileStructure: [],
        milestones: [],
        risks: [],
      } as SpecOutput;
    });
    await handler({ idea: 'A test application for freelancers' });
    expect(calledWith).toBeDefined();
  });

  it('returns formatted markdown', async () => {
    const handler = createSpecToolHandler(async () => ({
      product: { name: 'TimeTracker', oneLiner: 'Track time', problem: 'Problem', solution: 'Solution' },
      personas: [{ name: 'Freelancer', description: 'A freelancer', painPoints: ['Messy timesheets'], goals: ['Get paid'] }],
      userFlows: [{ id: 'track', name: 'Track Time', steps: ['Start timer', 'Stop timer'] }],
      dataModel: {
        entities: [{ name: 'TimeEntry', fields: [{ name: 'id', type: 'string', required: true }] }],
        relationships: [],
      },
      apiContract: { style: 'rest', endpoints: [{ method: 'POST', path: '/time', description: 'Create entry' }] },
      techStack: { layers: [{ layer: 'Frontend', technology: 'React', justification: 'Fast' }], justification: 'Modern' },
      fileStructure: [{ path: 'src', type: 'directory' }],
      milestones: [{ week: 1, name: 'MVP', deliverables: ['Core'] }],
      risks: [{ category: 'security', severity: 'high', description: 'Auth', mitigation: 'JWT' }],
    } as SpecOutput));

    const result = await handler({ idea: 'A test application for freelancers with invoicing' });
    const text = result.content[0].text;
    expect(text).toContain('TimeTracker');
    expect(text).toContain('Freelancer');
    expect(text).toContain('Track Time');
    expect(text).toContain('TimeEntry');
    expect(text).toContain('POST');
    expect(text).toContain('React');
    expect(text).toContain('HIGH');
  });

  it('returns error when generateSpec throws', async () => {
    const handler = createSpecToolHandler(async () => {
      throw new Error('LLM unavailable');
    });
    const result = await handler({ idea: 'A test application for freelancers with invoicing' });
    expect(result.content[0].text).toContain('Error Generating Specification');
    expect(result.content[0].text).toContain('LLM unavailable');
  });
});

describe('specToolHandler (stub)', () => {
  it('returns pending status', async () => {
    const result = await specToolHandler({ idea: 'A test application for freelancers with invoicing' });
    expect(result.content[0].text).toContain('not yet implemented');
  });
});

describe('createSpecGenerator', () => {
  it('throws without API key', async () => {
    const gen = createSpecGenerator({});
    await expect(gen({ idea: 'A test application for freelancers with invoicing' })).rejects.toThrow('ANTHROPIC_API_KEY is required');
  });

  it('uses custom model', () => {
    const gen = createSpecGenerator({ apiKey: 'test', model: 'custom-model' });
    expect(gen).toBeDefined();
  });

  it('uses custom maxRetries', () => {
    const gen = createSpecGenerator({ apiKey: 'test', maxRetries: 5 });
    expect(gen).toBeDefined();
  });
});
