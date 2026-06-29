import { describe, it, expect, afterEach , beforeEach} from 'bun:test';
import {
  createDispatcher,
  type Dispatcher,
} from '../../src/execution/dispatcher.js';
import { createMockSubagentRunner } from '../../src/execution/subagent.js';
import { createConnection, closeConnection, type DatabaseConnection } from '../../src/state/connection.js';
import { runMigrations } from '../../src/state/migrations.js';
import { createStore, type StateStore } from '../../src/state/store.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_DIR = path.join(process.cwd(), '.test-dispatcher');
let dispatcher: Dispatcher;
let store: StateStore;
let conn: DatabaseConnection;

beforeEach(() => {
  if (fs.existsSync(TEST_DB_DIR)) {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  conn = createConnection(path.join(TEST_DB_DIR, 'test.db'));
  runMigrations(conn);
  store = createStore(conn);
  store.createProject({ id: 'p1', name: 'Test', type: 'saas' });
  store.createSession({ id: 's1', projectId: 'p1', phase: 'building' });
  dispatcher = createDispatcher(path.join(TEST_DB_DIR, 'test.db'));
});

afterEach(() => {
  dispatcher?.close();
  closeConnection(conn);
  if (fs.existsSync(TEST_DB_DIR)) {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
  }
});

describe('Dispatcher', () => {
  describe('dispatch', () => {
    it('creates a task and returns task id', () => {
      const taskId = dispatcher.dispatch('p1', 's1', {
        title: 'Add button',
        description: 'Add a login button',
        complexityScore: 3,
        executionMode: 'inline',
      });
      expect(taskId).toBeTruthy();
    });

    it('persists task to database', () => {
      const taskId = dispatcher.dispatch('p1', 's1', {
        title: 'Test task',
        description: 'Desc',
        complexityScore: 5,
        executionMode: 'inline',
      });
      const task = dispatcher.getTask(taskId);
      expect(task).toBeDefined();
      expect(task!.title).toBe('Test task');
      expect(task!.status).toBe('pending');
    });
  });

  describe('getTask', () => {
    it('returns task by id', () => {
      const taskId = dispatcher.dispatch('p1', 's1', {
        title: 'Task',
        description: 'Desc',
        complexityScore: 3,
        executionMode: 'inline',
      });
      const task = dispatcher.getTask(taskId);
      expect(task).toBeDefined();
    });

    it('returns undefined for non-existent task', () => {
      expect(dispatcher.getTask('nonexistent')).toBeUndefined();
    });
  });

  describe('listTasks', () => {
    it('lists tasks by status', () => {
      dispatcher.dispatch('p1', 's1', {
        title: 'Task 1',
        description: 'Desc',
        complexityScore: 3,
        executionMode: 'inline',
      });
      dispatcher.dispatch('p1', 's1', {
        title: 'Task 2',
        description: 'Desc',
        complexityScore: 5,
        executionMode: 'session',
      });
      const tasks = dispatcher.listTasks('s1');
      expect(tasks.length).toBe(2);
    });
  });

  describe('completeTask', () => {
    it('marks task as completed', () => {
      const taskId = dispatcher.dispatch('p1', 's1', {
        title: 'Task',
        description: 'Desc',
        complexityScore: 3,
        executionMode: 'inline',
      });
      dispatcher.completeTask(taskId, 'Done!');
      const task = dispatcher.getTask(taskId);
      expect(task!.status).toBe('completed');
      expect(task!.output).toBe('Done!');
    });
  });

  describe('failTask', () => {
    it('marks task as failed', () => {
      const taskId = dispatcher.dispatch('p1', 's1', {
        title: 'Task',
        description: 'Desc',
        complexityScore: 3,
        executionMode: 'inline',
      });
      dispatcher.failTask(taskId, 'Error occurred');
      const task = dispatcher.getTask(taskId);
      expect(task!.status).toBe('failed');
      expect(task!.output).toBe('Error occurred');
    });
  });

  describe('runSubagent', () => {
    it('marks task completed when runner succeeds', async () => {
      const runner = createMockSubagentRunner([{ exitCode: 0, stdout: 'done', stderr: '', timedOut: false }]);
      const taskId = dispatcher.dispatch('p1', 's1', {
        title: 'Subagent task',
        description: 'Run subagent',
        complexityScore: 16,
        executionMode: 'subagent',
      });
      await dispatcher.runSubagent(taskId, 'bun', ['run', 'build'], runner);
      const task = dispatcher.getTask(taskId);
      expect(task!.status).toBe('completed');
      expect(task!.output).toContain('done');
    });

    it('marks task failed when runner exits with non-zero', async () => {
      const runner = createMockSubagentRunner([{ exitCode: 1, stdout: '', stderr: 'build error', timedOut: false }]);
      const taskId = dispatcher.dispatch('p1', 's1', {
        title: 'Failing task',
        description: 'Should fail',
        complexityScore: 16,
        executionMode: 'subagent',
      });
      await dispatcher.runSubagent(taskId, 'bun', ['run', 'bad'], runner);
      const task = dispatcher.getTask(taskId);
      expect(task!.status).toBe('failed');
      expect(task!.output).toContain('build error');
    });

    it('marks task failed on timeout', async () => {
      const runner = createMockSubagentRunner([{ exitCode: -1, stdout: '', stderr: '', timedOut: true }]);
      const taskId = dispatcher.dispatch('p1', 's1', {
        title: 'Slow task',
        description: 'Times out',
        complexityScore: 16,
        executionMode: 'subagent',
      });
      await dispatcher.runSubagent(taskId, 'sleep', ['999'], runner);
      const task = dispatcher.getTask(taskId);
      expect(task!.status).toBe('failed');
      expect(task!.output).toContain('timed out');
    });

    it('passes options through to the runner', async () => {
      const runner = createMockSubagentRunner();
      const taskId = dispatcher.dispatch('p1', 's1', {
        title: 'Task with options',
        description: 'Desc',
        complexityScore: 16,
        executionMode: 'subagent',
      });
      await dispatcher.runSubagent(taskId, 'echo', ['hi'], runner, { cwd: '/tmp', env: { FOO: 'bar' } });
      expect(runner.calls[0].options).toMatchObject({ cwd: '/tmp', env: { FOO: 'bar' } });
    });
  });
});
