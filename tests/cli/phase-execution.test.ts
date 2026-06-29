import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { callLLM, buildPlanPrompt, buildBreakPrompt, buildDesignPrompt, parseLLMTasks } from '../../src/cli/phase-helpers.js';
import { ContextPipeline } from '../../src/context/pipeline.js';

const TMP = '/tmp/phase-exec-test';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeOpenAIResponse(content: string): Response {
  return new Response(
    JSON.stringify({ choices: [{ message: { role: 'assistant', content } }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

describe('callLLM', () => {
  it('returns fallback text when ANTHROPIC_API_KEY is not set', async () => {
    const orig = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const result = await callLLM('claude-sonnet-4-20250514', 'anthropic', 'sys', 'user');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('unavailable');
    } finally {
      if (orig !== undefined) process.env.ANTHROPIC_API_KEY = orig;
    }
  });

  it('uses injected LLMCallerOverride when provided', async () => {
    const mockText = '{"tasks": []}';
    const mockOverride = async (_model: string, _system: string, _user: string) => mockText;
    const result = await callLLM('claude-haiku', 'anthropic', 'sys', 'user', undefined, mockOverride);
    expect(result).toBe(mockText);
  });

  it('calls OpenAI-compatible endpoint for openai provider', async () => {
    const orig = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-openai-key';
    let capturedUrl = '';
    let capturedBody = '';
    const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return makeOpenAIResponse('OpenAI response text');
    };
    try {
      const result = await callLLM('gpt-4o', 'openai', 'sys', 'user prompt', 1024, undefined, mockFetch as typeof fetch);
      expect(result).toBe('OpenAI response text');
      expect(capturedUrl).toContain('openai.com');
      expect(capturedUrl).toContain('chat/completions');
      const body = JSON.parse(capturedBody);
      expect(body.model).toBe('gpt-4o');
      expect(body.messages.some((m: { role: string }) => m.role === 'system')).toBe(true);
      expect(body.messages.some((m: { role: string }) => m.role === 'user')).toBe(true);
    } finally {
      if (orig !== undefined) process.env.OPENAI_API_KEY = orig;
      else delete process.env.OPENAI_API_KEY;
    }
  });

  it('calls Google Gemini OpenAI-compatible endpoint for google provider', async () => {
    const orig = process.env.GOOGLE_API_KEY;
    process.env.GOOGLE_API_KEY = 'test-google-key';
    let capturedUrl = '';
    const mockFetch = async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return makeOpenAIResponse('Gemini response text');
    };
    try {
      const result = await callLLM('gemini-2.5-flash', 'google', 'sys', 'user', 1024, undefined, mockFetch as typeof fetch);
      expect(result).toBe('Gemini response text');
      expect(capturedUrl).toContain('generativelanguage.googleapis.com');
      expect(capturedUrl).toContain('chat/completions');
    } finally {
      if (orig !== undefined) process.env.GOOGLE_API_KEY = orig;
      else delete process.env.GOOGLE_API_KEY;
    }
  });

  it('returns fallback when OPENAI_API_KEY is not set', async () => {
    const orig = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const result = await callLLM('gpt-4o', 'openai', 'sys', 'user');
      expect(result).toContain('unavailable');
      expect(result).toContain('OPENAI_API_KEY');
    } finally {
      if (orig !== undefined) process.env.OPENAI_API_KEY = orig;
    }
  });

  it('returns fallback when GOOGLE_API_KEY is not set', async () => {
    const orig = process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    try {
      const result = await callLLM('gemini-2.5-flash', 'google', 'sys', 'user');
      expect(result).toContain('unavailable');
      expect(result).toContain('GOOGLE_API_KEY');
    } finally {
      if (orig !== undefined) process.env.GOOGLE_API_KEY = orig;
    }
  });

  it('returns fallback for unknown provider', async () => {
    const result = await callLLM('some-model', 'unknown', 'sys', 'user');
    expect(result).toContain('unavailable');
    expect(result).toContain('unknown');
  });

  it('returns fallback when OpenAI API returns non-200', async () => {
    const orig = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-key';
    const mockFetch = async () => new Response('Internal Server Error', { status: 500 });
    try {
      const result = await callLLM('gpt-4o', 'openai', 'sys', 'user', 1024, undefined, mockFetch as typeof fetch);
      expect(result).toContain('error');
    } finally {
      if (orig !== undefined) process.env.OPENAI_API_KEY = orig;
      else delete process.env.OPENAI_API_KEY;
    }
  });

  it('returns fallback when fetch throws (network error)', async () => {
    const orig = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-key';
    const mockFetch = async () => { throw new Error('Network error'); };
    try {
      const result = await callLLM('gpt-4o', 'openai', 'sys', 'user', 1024, undefined, mockFetch as typeof fetch);
      expect(result).toContain('error');
    } finally {
      if (orig !== undefined) process.env.OPENAI_API_KEY = orig;
      else delete process.env.OPENAI_API_KEY;
    }
  });

  it('passes max_tokens to OpenAI request', async () => {
    const orig = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = 'test-key';
    let capturedBody = '';
    const mockFetch = async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = String(init?.body ?? '');
      return makeOpenAIResponse('ok');
    };
    try {
      await callLLM('gpt-4o', 'openai', 'sys', 'user', 2048, undefined, mockFetch as typeof fetch);
      const body = JSON.parse(capturedBody);
      expect(body.max_tokens).toBe(2048);
    } finally {
      if (orig !== undefined) process.env.OPENAI_API_KEY = orig;
      else delete process.env.OPENAI_API_KEY;
    }
  });

  it('anthropic path short-circuits to override before any fetch when override provided', async () => {
    let overrideCalled = false;
    const mockOverride = async (_model: string, _sys: string, _user: string) => {
      overrideCalled = true;
      return 'override-result';
    };
    const result = await callLLM('claude-sonnet-4-6', 'anthropic', 'sys', 'user', 1024, mockOverride);
    expect(overrideCalled).toBe(true);
    expect(result).toBe('override-result');
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

describe('DLP sanitization of file context before LLM calls', () => {
  const pipeline = new ContextPipeline(process.cwd());

  it('strips AWS keys from design-doc before buildPlanPrompt', () => {
    // Bare key without an API_KEY= prefix so only the AWS pattern fires
    const rawDoc = '# Design\nCloud access: AKIAIOSFODNN7EXAMPLE';
    const sanitized = pipeline.sanitize(rawDoc);
    const prompt = buildPlanPrompt('build something', sanitized);
    expect(prompt).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(prompt).toContain('***MASKED_AWS_KEY***');
  });

  it('strips JWT tokens from design-doc before buildDesignPrompt', () => {
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const rawDoc = `# Design\nAuthorization: Bearer ${token}`;
    const sanitized = pipeline.sanitize(rawDoc);
    const prompt = buildDesignPrompt('build auth UI', sanitized);
    expect(prompt).not.toContain(token);
    expect(prompt).toContain('***MASKED_JWT***');
  });

  it('strips connection strings from task-plan before buildBreakPrompt', () => {
    const rawPlan = '# Plan\nConnect to postgresql://user:password@localhost/mydb';
    const sanitized = pipeline.sanitize(rawPlan);
    const prompt = buildBreakPrompt('build something', sanitized);
    expect(prompt).not.toContain('postgresql://user:password@localhost/mydb');
    expect(prompt).toContain('***MASKED_CONNECTION_STRING***');
  });
});
