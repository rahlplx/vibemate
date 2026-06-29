import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { callLLM, buildPlanPrompt, buildBreakPrompt, buildDesignPrompt, parseLLMTasks } from '../../src/cli/phase-helpers.js';

const TMP = '/tmp/phase-exec-test';

describe('callLLM', () => {
  it('returns fallback text when ANTHROPIC_API_KEY is not set', async () => {
    const orig = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const result = await callLLM('claude-sonnet-4-20250514', 'anthropic', 'sys', 'user');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    } finally {
      if (orig !== undefined) process.env.ANTHROPIC_API_KEY = orig;
    }
  });

  it('uses injected fetch override when provided', async () => {
    const mockText = '{"tasks": []}';
    const mockFetch = async (_model: string, _system: string, _user: string) => mockText;
    const result = await callLLM('claude-haiku', 'anthropic', 'sys', 'user', undefined, mockFetch);
    expect(result).toBe(mockText);
  });
});

describe('buildPlanPrompt', () => {
  it('includes description and design doc content', () => {
    const prompt = buildPlanPrompt('build a REST API', '# Design Doc\nCore requirements...');
    expect(prompt).toContain('build a REST API');
    expect(prompt).toContain('Design Doc');
    expect(prompt).toContain('task-plan.md');
  });

  it('includes tasks.json output format', () => {
    const prompt = buildPlanPrompt('task', '');
    expect(prompt).toContain('tasks.json');
    expect(prompt).toContain('complexityScore');
    expect(prompt).toContain('executionMode');
  });
});

describe('buildBreakPrompt', () => {
  it('includes task plan content', () => {
    const prompt = buildBreakPrompt('build a REST API', '## Milestone 1\n- Task A\n- Task B');
    expect(prompt).toContain('Milestone 1');
    expect(prompt).toContain('Task A');
    expect(prompt).toContain('acceptance criteria');
  });

  it('requests JSON tasks array', () => {
    const prompt = buildBreakPrompt('build', '');
    expect(prompt).toContain('"tasks"');
    expect(prompt).toContain('acceptanceCriteria');
  });
});

describe('buildDesignPrompt', () => {
  it('includes description', () => {
    const prompt = buildDesignPrompt('auth UI with login/signup', '# Design Doc');
    expect(prompt).toContain('auth UI');
    expect(prompt).toContain('wireframe');
  });
});

describe('parseLLMTasks', () => {
  it('parses valid tasks array from JSON', () => {
    const raw = JSON.stringify({
      tasks: [
        { id: 't1', title: 'Task One', description: 'Do something', milestone: 'M1', complexityScore: 3, executionMode: 'inline', acceptanceCriteria: ['AC1'], dependencies: [], files: [] }
      ]
    });
    const tasks = parseLLMTasks(raw);
    expect(tasks.length).toBe(1);
    expect(tasks[0].title).toBe('Task One');
    expect(tasks[0].complexityScore).toBe(3);
  });

  it('returns empty array on invalid JSON', () => {
    const tasks = parseLLMTasks('not json at all');
    expect(tasks).toEqual([]);
  });

  it('returns empty array on missing tasks field', () => {
    const tasks = parseLLMTasks('{"other": []}');
    expect(tasks).toEqual([]);
  });

  it('accepts partial task objects and fills defaults', () => {
    const raw = JSON.stringify({
      tasks: [{ title: 'Minimal', description: 'Do it' }]
    });
    const tasks = parseLLMTasks(raw);
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBeDefined();
    expect(tasks[0].executionMode).toBeDefined();
    expect(Array.isArray(tasks[0].acceptanceCriteria)).toBe(true);
    expect(Array.isArray(tasks[0].dependencies)).toBe(true);
  });

  it('extracts tasks from JSON embedded in markdown text', () => {
    const raw = `Here is the plan:\n\n\`\`\`json\n${JSON.stringify({ tasks: [{ title: 'T1', description: 'D1' }] })}\n\`\`\``;
    const tasks = parseLLMTasks(raw);
    expect(tasks.length).toBe(1);
  });

  it('assigns unique ids when id field is missing', () => {
    const raw = JSON.stringify({
      tasks: [
        { title: 'A', description: 'A' },
        { title: 'B', description: 'B' },
      ]
    });
    const tasks = parseLLMTasks(raw);
    const ids = tasks.map(t => t.id);
    expect(new Set(ids).size).toBe(2);
  });
});

describe('phase artifacts integration', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(TMP, String(Date.now()));
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(TMP, { recursive: true, force: true });
  });

  it('buildPlanPrompt references design-doc content when provided', async () => {
    const designDoc = '# Design Doc\n## Task\nbuild auth module\n## Requirements\n- login\n- signup';
    await writeFile(join(tmpDir, 'design-doc.md'), designDoc);
    const read = await readFile(join(tmpDir, 'design-doc.md'), 'utf-8');
    const prompt = buildPlanPrompt('build auth module', read);
    expect(prompt).toContain('login');
    expect(prompt).toContain('signup');
  });

  it('buildBreakPrompt references task-plan content when provided', async () => {
    const taskPlan = '# Task Plan\n## Milestone 1: Setup\n- Install deps\n- Create config\n## Milestone 2: Core\n- Auth endpoint';
    await writeFile(join(tmpDir, 'task-plan.md'), taskPlan);
    const read = await readFile(join(tmpDir, 'task-plan.md'), 'utf-8');
    const prompt = buildBreakPrompt('build auth', read);
    expect(prompt).toContain('Milestone 1');
    expect(prompt).toContain('Milestone 2');
    expect(prompt).toContain('Auth endpoint');
  });
});
