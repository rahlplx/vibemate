import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { rm } from 'fs/promises';
import { join } from 'path';
import { dispatchBuildTasks, completeBuildTasks } from '../../src/cli/auto-helpers.js';
import { createDispatcher } from '../../src/execution/dispatcher.js';
import type { LLMTask } from '../../src/cli/phase-helpers.js';

const DB_PATH = join(process.cwd(), '.test-build-dispatch', 'test.db');

const makeTasks = (): (LLMTask & { gatedMode: string })[] => [
  {
    id: 't1', title: 'Setup project', description: 'Create directory structure',
    milestone: 'M1', complexityScore: 2, executionMode: 'inline', gatedMode: 'inline',
    acceptanceCriteria: [], dependencies: [], files: [],
  },
  {
    id: 't2', title: 'Core logic', description: 'Implement main feature',
    milestone: 'M1', complexityScore: 8, executionMode: 'session', gatedMode: 'session',
    acceptanceCriteria: [], dependencies: ['t1'], files: [],
  },
  {
    id: 't3', title: 'Complex migration', description: 'Migrate data schema',
    milestone: 'M2', complexityScore: 16, executionMode: 'subagent', gatedMode: 'subagent',
    acceptanceCriteria: [], dependencies: ['t2'], files: [],
  },
];

describe('dispatchBuildTasks', () => {
  let dispatcher: ReturnType<typeof createDispatcher>;

  beforeEach(async () => {
    await rm(join(process.cwd(), '.test-build-dispatch'), { recursive: true, force: true });
    const { mkdirSync } = await import('fs');
    mkdirSync(join(process.cwd(), '.test-build-dispatch'), { recursive: true });
    dispatcher = createDispatcher(DB_PATH);
  });

  afterEach(() => {
    dispatcher?.close();
    return rm(join(process.cwd(), '.test-build-dispatch'), { recursive: true, force: true });
  });

  it('returns one taskId per classified task', () => {
    const tasks = makeTasks();
    const ids = dispatchBuildTasks(tasks, dispatcher, 'proj-1', 'sess-1');
    expect(ids.length).toBe(3);
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
  });

  it('all dispatched tasks start with pending status', () => {
    const ids = dispatchBuildTasks(makeTasks(), dispatcher, 'proj-1', 'sess-1');
    for (const id of ids) {
      const task = dispatcher.getTask(id);
      expect(task?.status).toBe('pending');
    }
  });

  it('task titles and executionModes are preserved', () => {
    const tasks = makeTasks();
    const ids = dispatchBuildTasks(tasks, dispatcher, 'proj-1', 'sess-1');
    const stored = ids.map(id => dispatcher.getTask(id)!);
    expect(stored[0].title).toBe('Setup project');
    expect(stored[0].execution_mode).toBe('inline');
    expect(stored[2].title).toBe('Complex migration');
    expect(stored[2].execution_mode).toBe('subagent');
  });

  it('tasks are retrievable by sessionId via listTasks', () => {
    dispatchBuildTasks(makeTasks(), dispatcher, 'proj-1', 'sess-build-123');
    const listed = dispatcher.listTasks('sess-build-123');
    expect(listed.length).toBe(3);
  });

  it('tasks from different sessions are isolated', () => {
    dispatchBuildTasks(makeTasks(), dispatcher, 'proj-1', 'sess-A');
    dispatchBuildTasks(makeTasks(), dispatcher, 'proj-1', 'sess-B');
    expect(dispatcher.listTasks('sess-A').length).toBe(3);
    expect(dispatcher.listTasks('sess-B').length).toBe(3);
  });
});

describe('completeBuildTasks', () => {
  let dispatcher: ReturnType<typeof createDispatcher>;

  beforeEach(async () => {
    await rm(join(process.cwd(), '.test-build-dispatch'), { recursive: true, force: true });
    const { mkdirSync } = await import('fs');
    mkdirSync(join(process.cwd(), '.test-build-dispatch'), { recursive: true });
    dispatcher = createDispatcher(DB_PATH);
  });

  afterEach(() => {
    dispatcher?.close();
    return rm(join(process.cwd(), '.test-build-dispatch'), { recursive: true, force: true });
  });

  it('marks all tasks completed when buildSuccess is true', () => {
    const ids = dispatchBuildTasks(makeTasks(), dispatcher, 'proj-1', 'sess-1');
    completeBuildTasks(ids, dispatcher, true);
    for (const id of ids) {
      expect(dispatcher.getTask(id)?.status).toBe('completed');
    }
  });

  it('marks all tasks failed when buildSuccess is false', () => {
    const ids = dispatchBuildTasks(makeTasks(), dispatcher, 'proj-1', 'sess-1');
    completeBuildTasks(ids, dispatcher, false);
    for (const id of ids) {
      expect(dispatcher.getTask(id)?.status).toBe('failed');
    }
  });

  it('completed tasks have a non-empty output', () => {
    const ids = dispatchBuildTasks(makeTasks(), dispatcher, 'proj-1', 'sess-1');
    completeBuildTasks(ids, dispatcher, true);
    for (const id of ids) {
      expect(dispatcher.getTask(id)?.output).toBeTruthy();
    }
  });

  it('failed tasks have a non-empty output', () => {
    const ids = dispatchBuildTasks(makeTasks(), dispatcher, 'proj-1', 'sess-1');
    completeBuildTasks(ids, dispatcher, false);
    for (const id of ids) {
      expect(dispatcher.getTask(id)?.output).toBeTruthy();
    }
  });
});
