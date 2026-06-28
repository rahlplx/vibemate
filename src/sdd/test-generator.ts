import type { SpecOutput } from '../mcp/tools/spec.js';

export type TestFramework = 'bun' | 'vitest' | 'jest';
export type TestCategory = 'unit' | 'integration' | 'e2e' | 'security' | 'performance';

export interface TestCase {
  name: string;
  description: string;
  category: TestCategory;
  inputs?: string[];
  expectedBehavior: string;
  tags: string[];
}

export interface TestFile {
  path: string;
  framework: TestFramework;
  cases: TestCase[];
  content: string;
}

export interface TestGenerationResult {
  specName: string;
  generatedAt: string;
  files: TestFile[];
  totalCases: number;
  coverageAreas: string[];
}

export interface TestGenerationOptions {
  framework?: TestFramework;
  outputDir?: string;
}

export function generateTests(spec: SpecOutput, options: TestGenerationOptions = {}): TestGenerationResult {
  const framework = options.framework ?? 'bun';
  const outputDir = options.outputDir ?? 'tests/spec';
  const files: TestFile[] = [];
  const coverageAreas: string[] = [];

  const apiFile = generateApiTests(spec, framework, outputDir);
  if (apiFile) { files.push(apiFile); coverageAreas.push('api'); }

  const flowFile = generateFlowTests(spec, framework, outputDir);
  if (flowFile) { files.push(flowFile); coverageAreas.push('flows'); }

  const modelFile = generateModelTests(spec, framework, outputDir);
  if (modelFile) { files.push(modelFile); coverageAreas.push('models'); }

  const secFile = generateSecurityTests(spec, framework, outputDir);
  if (secFile) { files.push(secFile); coverageAreas.push('security'); }

  const totalCases = files.reduce((n, f) => n + f.cases.length, 0);

  return {
    specName: spec.product.name,
    generatedAt: new Date().toISOString(),
    files,
    totalCases,
    coverageAreas,
  };
}

function importLine(framework: TestFramework): string {
  if (framework === 'bun') return "import { describe, it } from 'bun:test';";
  if (framework === 'vitest') return "import { describe, it } from 'vitest';";
  return "import { describe, it } from '@jest/globals';";
}

function generateApiTests(spec: SpecOutput, framework: TestFramework, outputDir: string): TestFile | null {
  if (spec.apiContract.endpoints.length === 0) return null;

  const cases: TestCase[] = spec.apiContract.endpoints.map(ep => ({
    name: `${ep.method} ${ep.path} — ${ep.description}`,
    description: ep.description,
    category: 'integration' as TestCategory,
    expectedBehavior: `${ep.method} ${ep.path} responds correctly`,
    tags: [ep.method, spec.apiContract.style],
  }));

  const blocks = spec.apiContract.endpoints.map(ep =>
    `  describe('${ep.method} ${ep.path}', () => {\n` +
    `    it.todo('${ep.description}');\n` +
    `    it.todo('returns error for invalid input');\n` +
    `  });`
  ).join('\n\n');

  const content =
    `${importLine(framework)}\n\n` +
    `describe('API Contract — ${spec.product.name}', () => {\n${blocks}\n});\n`;

  return { path: `${outputDir}/api.test.ts`, framework, cases, content };
}

function generateFlowTests(spec: SpecOutput, framework: TestFramework, outputDir: string): TestFile | null {
  if (spec.userFlows.length === 0) return null;

  const personaNames = spec.personas.map(p => p.name);
  const cases: TestCase[] = [];

  for (const flow of spec.userFlows) {
    for (const step of flow.steps) {
      cases.push({
        name: `${flow.name} — step: ${step}`,
        description: step,
        category: 'e2e',
        expectedBehavior: step,
        tags: ['flow', flow.id, ...personaNames],
      });
    }
    cases.push({
      name: `${flow.name} — completes end-to-end`,
      description: `Full ${flow.name} flow`,
      category: 'e2e',
      expectedBehavior: `User completes ${flow.name} without errors`,
      tags: ['flow', flow.id, 'e2e', ...personaNames],
    });
  }

  const blocks = spec.userFlows.map(flow => {
    const stepLines = flow.steps.map(s => `    it.todo('${escapeQuotes(s)}');`).join('\n');
    return (
      `  describe('${escapeQuotes(flow.name)}', () => {\n` +
      `${stepLines}\n` +
      `    it.todo('completes end-to-end');\n` +
      `  });`
    );
  }).join('\n\n');

  const content =
    `${importLine(framework)}\n\n` +
    `describe('User Flows — ${spec.product.name}', () => {\n${blocks}\n});\n`;

  return { path: `${outputDir}/flows.test.ts`, framework, cases, content };
}

function generateModelTests(spec: SpecOutput, framework: TestFramework, outputDir: string): TestFile | null {
  if (spec.dataModel.entities.length === 0) return null;

  const cases: TestCase[] = [];

  for (const entity of spec.dataModel.entities) {
    for (const field of entity.fields) {
      if (!field.required) continue;
      cases.push({
        name: `${entity.name} — required field: ${field.name}`,
        description: `${entity.name}.${field.name} is required (${field.type})`,
        category: 'unit',
        expectedBehavior: `Rejects ${entity.name} missing ${field.name}`,
        tags: ['model', entity.name, 'validation'],
      });
    }
    cases.push({
      name: `${entity.name} — accepts valid data`,
      description: `Valid ${entity.name} passes all validations`,
      category: 'unit',
      expectedBehavior: `Valid ${entity.name} is accepted`,
      tags: ['model', entity.name],
    });
  }

  const blocks = spec.dataModel.entities.map(entity => {
    const requiredFields = entity.fields.filter(f => f.required);
    const fieldLines = requiredFields
      .map(f => `    it.todo('rejects missing required field: ${f.name}');`)
      .join('\n');
    return (
      `  describe('${entity.name}', () => {\n` +
      `${fieldLines ? fieldLines + '\n' : ''}` +
      `    it.todo('accepts valid ${entity.name} data');\n` +
      `  });`
    );
  }).join('\n\n');

  const content =
    `${importLine(framework)}\n\n` +
    `describe('Data Models — ${spec.product.name}', () => {\n${blocks}\n});\n`;

  return { path: `${outputDir}/models.test.ts`, framework, cases, content };
}

function generateSecurityTests(spec: SpecOutput, framework: TestFramework, outputDir: string): TestFile | null {
  const actionableRisks = spec.risks.filter(r => r.severity === 'critical' || r.severity === 'high');
  if (actionableRisks.length === 0) return null;

  const cases: TestCase[] = [];
  for (const risk of actionableRisks) {
    cases.push({
      name: `${risk.category}: ${risk.description}`,
      description: risk.description,
      category: 'security',
      expectedBehavior: risk.mitigation,
      tags: ['security', risk.category, risk.severity],
    });
    cases.push({
      name: `${risk.category}: mitigation — ${risk.mitigation}`,
      description: `Verify mitigation: ${risk.mitigation}`,
      category: 'security',
      expectedBehavior: `Mitigation in place: ${risk.mitigation}`,
      tags: ['security', risk.category, risk.severity, 'mitigation'],
    });
  }

  const blocks = actionableRisks.map(risk =>
    `  describe('[${risk.severity.toUpperCase()}] ${escapeQuotes(risk.category)}: ${escapeQuotes(risk.description)}', () => {\n` +
    `    it.todo('${escapeQuotes(risk.description)}');\n` +
    `    it.todo('mitigation: ${escapeQuotes(risk.mitigation)}');\n` +
    `  });`
  ).join('\n\n');

  const content =
    `${importLine(framework)}\n\n` +
    `describe('Security & Risk — ${spec.product.name}', () => {\n${blocks}\n});\n`;

  return { path: `${outputDir}/security.test.ts`, framework, cases, content };
}

function escapeQuotes(s: string): string {
  return s.replace(/'/g, "\\'");
}
