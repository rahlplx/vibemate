import { describe, it, expect } from 'bun:test';
import {
  generateTests,
  type TestGenerationResult,
  type TestFile,
  type TestCase,
} from '../../src/sdd/test-generator.js';
import type { SpecOutput } from '../../src/mcp/tools/spec.js';

function makeSpec(overrides: Partial<SpecOutput> = {}): SpecOutput {
  return {
    product: {
      name: 'TaskFlow',
      oneLiner: 'Task management for distributed teams',
      problem: 'Teams lose track of tasks across tools',
      solution: 'Unified task board with AI prioritization',
    },
    personas: [
      {
        name: 'Project Manager',
        description: 'Coordinates team deliverables',
        painPoints: ['Context switching', 'Status updates'],
        goals: ['On-time delivery', 'Team visibility'],
      },
      {
        name: 'Developer',
        description: 'Implements features',
        painPoints: ['Unclear requirements'],
        goals: ['Focus time', 'Clear tasks'],
      },
    ],
    userFlows: [
      {
        id: 'flow-1',
        name: 'Create Task',
        steps: ['User navigates to board', 'User clicks Add Task', 'User fills form', 'Task appears on board'],
      },
      {
        id: 'flow-2',
        name: 'Assign Task',
        steps: ['User selects task', 'User picks assignee from dropdown', 'Assignee receives notification'],
      },
    ],
    dataModel: {
      entities: [
        {
          name: 'Task',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'assigneeId', type: 'string', required: false },
          ],
        },
        {
          name: 'User',
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'email', type: 'string', required: true },
          ],
        },
      ],
      relationships: [
        { from: 'Task', to: 'User', type: 'many-to-many', description: 'Tasks can have multiple assignees' },
      ],
    },
    apiContract: {
      style: 'rest',
      endpoints: [
        { method: 'GET', path: '/tasks', description: 'List all tasks' },
        { method: 'POST', path: '/tasks', description: 'Create a new task' },
        { method: 'PUT', path: '/tasks/:id', description: 'Update a task' },
        { method: 'DELETE', path: '/tasks/:id', description: 'Delete a task' },
      ],
    },
    techStack: {
      layers: [{ layer: 'Frontend', technology: 'React', justification: 'Component model' }],
      justification: 'Modern full-stack',
    },
    fileStructure: [
      { path: 'src/', type: 'directory', description: 'Source' },
      { path: 'src/index.ts', type: 'file', description: 'Entry point' },
    ],
    milestones: [
      { week: 1, name: 'Foundation', deliverables: ['Auth', 'DB schema'] },
    ],
    risks: [
      { category: 'security', severity: 'high', description: 'SQL injection', mitigation: 'Use parameterized queries' },
      { category: 'scaling', severity: 'medium', description: 'DB bottleneck', mitigation: 'Add caching' },
      { category: 'operational', severity: 'low', description: 'Monitoring gaps', mitigation: 'Add alerts' },
    ],
    ...overrides,
  };
}

describe('generateTests()', () => {
  it('returns a TestGenerationResult with required fields', () => {
    const result = generateTests(makeSpec());
    expect(typeof result.specName).toBe('string');
    expect(typeof result.generatedAt).toBe('string');
    expect(Array.isArray(result.files)).toBe(true);
    expect(typeof result.totalCases).toBe('number');
    expect(Array.isArray(result.coverageAreas)).toBe(true);
  });

  it('generatedAt is a valid ISO date string', () => {
    const result = generateTests(makeSpec());
    expect(() => new Date(result.generatedAt).toISOString()).not.toThrow();
  });

  it('totalCases matches sum of cases across files', () => {
    const result = generateTests(makeSpec());
    const sum = result.files.reduce((n, f) => n + f.cases.length, 0);
    expect(result.totalCases).toBe(sum);
  });

  it('produces a file for API endpoints', () => {
    const result = generateTests(makeSpec());
    const apiFile = result.files.find(f => f.path.includes('api'));
    expect(apiFile).toBeDefined();
    expect(apiFile!.cases.length).toBeGreaterThan(0);
  });

  it('generates one test case per API endpoint', () => {
    const spec = makeSpec();
    const result = generateTests(spec);
    const apiFile = result.files.find(f => f.path.includes('api'));
    expect(apiFile!.cases.length).toBeGreaterThanOrEqual(spec.apiContract.endpoints.length);
  });

  it('produces a file for user flows', () => {
    const result = generateTests(makeSpec());
    const flowFile = result.files.find(f => f.path.includes('flow'));
    expect(flowFile).toBeDefined();
    expect(flowFile!.cases.length).toBeGreaterThan(0);
  });

  it('generates one case per flow step plus one end-to-end case per flow', () => {
    const spec = makeSpec();
    const result = generateTests(spec);
    const flowFile = result.files.find(f => f.path.includes('flow'))!;
    const totalSteps = spec.userFlows.reduce((n, f) => n + f.steps.length, 0);
    const endToEndCases = spec.userFlows.length;
    expect(flowFile.cases.length).toBe(totalSteps + endToEndCases);
  });

  it('produces a file for data model entities', () => {
    const result = generateTests(makeSpec());
    const modelFile = result.files.find(f => f.path.includes('model'));
    expect(modelFile).toBeDefined();
    expect(modelFile!.cases.length).toBeGreaterThan(0);
  });

  it('generates validation cases for required fields only', () => {
    const spec = makeSpec();
    const result = generateTests(spec);
    const modelFile = result.files.find(f => f.path.includes('model'))!;
    const validationCases = modelFile.cases.filter(c => c.name.includes('required'));
    const totalRequired = spec.dataModel.entities.reduce(
      (n, e) => n + e.fields.filter(f => f.required).length, 0
    );
    expect(validationCases.length).toBe(totalRequired);
  });

  it('produces a security file for critical and high risks only', () => {
    const result = generateTests(makeSpec());
    const secFile = result.files.find(f => f.path.includes('security'));
    expect(secFile).toBeDefined();
    // Only 'high' risk in fixture (not 'critical') → 1 risk
    expect(secFile!.cases.length).toBe(2);
  });

  it('excludes low-severity risks from security tests', () => {
    const spec = makeSpec();
    const result = generateTests(spec);
    const secFile = result.files.find(f => f.path.includes('security'))!;
    const lowCases = secFile.cases.filter(c => c.name.toLowerCase().includes('monitoring'));
    expect(lowCases.length).toBe(0);
  });

  it('defaults to bun framework', () => {
    const result = generateTests(makeSpec());
    for (const file of result.files) {
      expect(file.framework).toBe('bun');
    }
  });

  it('respects framework option', () => {
    const result = generateTests(makeSpec(), { framework: 'vitest' });
    for (const file of result.files) {
      expect(file.framework).toBe('vitest');
    }
  });

  it('respects outputDir option in file paths', () => {
    const result = generateTests(makeSpec(), { outputDir: 'tests/generated' });
    for (const file of result.files) {
      expect(file.path.startsWith('tests/generated/')).toBe(true);
    }
  });

  it('defaults outputDir to tests/spec', () => {
    const result = generateTests(makeSpec());
    for (const file of result.files) {
      expect(file.path.startsWith('tests/spec/')).toBe(true);
    }
  });

  it('each test case has required fields', () => {
    const result = generateTests(makeSpec());
    for (const file of result.files) {
      for (const tc of file.cases) {
        expect(typeof tc.name).toBe('string');
        expect(tc.name.length).toBeGreaterThan(0);
        expect(typeof tc.description).toBe('string');
        expect(['unit', 'integration', 'e2e', 'security', 'performance']).toContain(tc.category);
        expect(typeof tc.expectedBehavior).toBe('string');
        expect(Array.isArray(tc.tags)).toBe(true);
      }
    }
  });

  it('each generated file has non-empty content', () => {
    const result = generateTests(makeSpec());
    for (const file of result.files) {
      expect(file.content.length).toBeGreaterThan(0);
      expect(file.content).toContain('describe(');
      expect(file.content).toContain('it.todo(');
    }
  });

  it('file content uses bun:test import for bun framework', () => {
    const result = generateTests(makeSpec(), { framework: 'bun' });
    for (const file of result.files) {
      expect(file.content).toContain("from 'bun:test'");
    }
  });

  it('file content uses vitest import for vitest framework', () => {
    const result = generateTests(makeSpec(), { framework: 'vitest' });
    for (const file of result.files) {
      expect(file.content).toContain("from 'vitest'");
    }
  });

  it('coverageAreas contains api, flows, models, and security', () => {
    const result = generateTests(makeSpec());
    expect(result.coverageAreas).toContain('api');
    expect(result.coverageAreas).toContain('flows');
    expect(result.coverageAreas).toContain('models');
    expect(result.coverageAreas).toContain('security');
  });

  it('empty spec produces minimal result', () => {
    const empty = makeSpec({
      personas: [],
      userFlows: [],
      dataModel: { entities: [], relationships: [] },
      apiContract: { style: 'rest', endpoints: [] },
      risks: [],
    });
    const result = generateTests(empty);
    expect(result.files.length).toBe(0);
    expect(result.totalCases).toBe(0);
    expect(result.coverageAreas.length).toBe(0);
  });

  it('specName is derived from product name', () => {
    const result = generateTests(makeSpec());
    expect(result.specName).toBe('TaskFlow');
  });

  it('API test cases are tagged with endpoint method', () => {
    const result = generateTests(makeSpec());
    const apiFile = result.files.find(f => f.path.includes('api'))!;
    const getMethods = apiFile.cases.filter(c => c.tags.includes('GET'));
    expect(getMethods.length).toBeGreaterThanOrEqual(1);
  });

  it('file content uses jest import for jest framework', () => {
    const result = generateTests(makeSpec(), { framework: 'jest' });
    for (const file of result.files) {
      expect(file.content).toContain("from '@jest/globals'");
    }
  });

  it('flow test cases are tagged with persona names', () => {
    const spec = makeSpec();
    const result = generateTests(spec);
    const flowFile = result.files.find(f => f.path.includes('flow'))!;
    const allTags = flowFile.cases.flatMap(c => c.tags);
    expect(allTags.some(t => t === 'Project Manager' || t === 'Developer')).toBe(true);
  });
});
