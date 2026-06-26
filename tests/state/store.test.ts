import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { createStore, type StateStore } from '../../src/state/store.js';
import { createConnection, closeConnection, type DatabaseConnection } from '../../src/state/connection.js';
import { runMigrations } from '../../src/state/migrations.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_DIR = path.join(process.cwd(), '.test-state-store');
let conn: DatabaseConnection;
let store: StateStore;

beforeEach(() => {
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  conn = createConnection(path.join(TEST_DB_DIR, 'test.db'));
  runMigrations(conn);
  store = createStore(conn);
});

afterEach(() => {
  closeConnection(conn);
  if (fs.existsSync(TEST_DB_DIR)) {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
  }
});

describe('Project operations', () => {
  it('creates and retrieves a project', () => {
    const project = store.createProject({
      id: 'p1',
      name: 'My App',
      description: 'A cool app',
      type: 'saas',
    });
    expect(project.name).toBe('My App');

    const retrieved = store.getProject('p1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.name).toBe('My App');
  });

  it('lists all projects', () => {
    store.createProject({ id: 'p1', name: 'App 1', type: 'saas' });
    store.createProject({ id: 'p2', name: 'App 2', type: 'cli' });
    const projects = store.listProjects();
    expect(projects.length).toBe(2);
  });

  it('updates a project', () => {
    store.createProject({ id: 'p1', name: 'App', type: 'saas' });
    store.updateProject('p1', { description: 'Updated description' });
    const updated = store.getProject('p1');
    expect(updated!.description).toBe('Updated description');
  });

  it('deletes a project', () => {
    store.createProject({ id: 'p1', name: 'App', type: 'saas' });
    store.deleteProject('p1');
    expect(store.getProject('p1')).toBeUndefined();
  });
});

describe('Session operations', () => {
  it('creates and retrieves a session', () => {
    store.createProject({ id: 'p1', name: 'App', type: 'saas' });
    const session = store.createSession({
      id: 's1',
      projectId: 'p1',
      phase: 'discovery',
    });
    expect(session.phase).toBe('discovery');

    const retrieved = store.getSession('s1');
    expect(retrieved).toBeDefined();
    expect(retrieved!.phase).toBe('discovery');
  });

  it('updates session answers', () => {
    store.createProject({ id: 'p1', name: 'App', type: 'saas' });
    store.createSession({ id: 's1', projectId: 'p1', phase: 'discovery' });
    store.updateSessionAnswers('s1', [
      { questionId: 'q1', value: 'SaaS', timestamp: new Date().toISOString() },
    ]);
    const session = store.getSession('s1');
    expect(session!.answers).toBe('[{"questionId":"q1","value":"SaaS"}]');
  });

  it('lists sessions for a project', () => {
    store.createProject({ id: 'p1', name: 'App', type: 'saas' });
    store.createSession({ id: 's1', projectId: 'p1', phase: 'discovery' });
    store.createSession({ id: 's2', projectId: 'p1', phase: 'planning' });
    const sessions = store.listSessions('p1');
    expect(sessions.length).toBe(2);
  });
});

describe('Decision operations', () => {
  it('creates and retrieves a decision', () => {
    store.createProject({ id: 'p1', name: 'App', type: 'saas' });
    store.createSession({ id: 's1', projectId: 'p1', phase: 'discovery' });
    const decision = store.createDecision({
      id: 'd1',
      sessionId: 's1',
      category: 'database',
      question: 'Which database?',
      answer: 'SQLite',
      rationale: 'Local-first',
      hash: 'abc123',
    });
    expect(decision.answer).toBe('SQLite');

    const decisions = store.listDecisions('s1');
    expect(decisions.length).toBe(1);
    expect(decisions[0].hash).toBe('abc123');
  });

  it('maintains hash chain', () => {
    store.createProject({ id: 'p1', name: 'App', type: 'saas' });
    store.createSession({ id: 's1', projectId: 'p1', phase: 'discovery' });
    store.createDecision({
      id: 'd1',
      sessionId: 's1',
      category: 'db',
      question: 'DB?',
      answer: 'SQLite',
      rationale: 'Fast',
      hash: 'hash1',
    });
    store.createDecision({
      id: 'd2',
      sessionId: 's1',
      category: 'runtime',
      question: 'Runtime?',
      answer: 'Bun',
      rationale: 'Fast',
      hash: 'hash2',
      previousHash: 'hash1',
    });
    const decisions = store.listDecisions('s1');
    expect(decisions[1].previousHash).toBe('hash1');
  });
});

describe('Task operations', () => {
  it('creates and updates a task', () => {
    store.createProject({ id: 'p1', name: 'App', type: 'saas' });
    store.createSession({ id: 's1', projectId: 'p1', phase: 'building' });
    const task = store.createTask({
      id: 't1',
      sessionId: 's1',
      title: 'Build feature',
      description: 'Implement X',
      status: 'pending',
      complexityScore: 5,
      executionMode: 'inline',
    });
    expect(task.status).toBe('pending');

    store.updateTask('t1', {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    const updated = store.getTask('t1');
    expect(updated!.status).toBe('completed');
  });

  it('lists tasks by status', () => {
    store.createProject({ id: 'p1', name: 'App', type: 'saas' });
    store.createSession({ id: 's1', projectId: 'p1', phase: 'building' });
    store.createTask({
      id: 't1',
      sessionId: 's1',
      title: 'Task 1',
      description: 'Desc',
      status: 'pending',
      complexityScore: 3,
      executionMode: 'inline',
    });
    store.createTask({
      id: 't2',
      sessionId: 's1',
      title: 'Task 2',
      description: 'Desc',
      status: 'completed',
      complexityScore: 5,
      executionMode: 'session',
    });
    const pending = store.listTasksByStatus('s1', 'pending');
    expect(pending.length).toBe(1);
    expect(pending[0].title).toBe('Task 1');
  });
});

describe('Observation operations', () => {
  it('creates an observation', () => {
    store.createProject({ id: 'p1', name: 'App', type: 'saas' });
    store.createSession({ id: 's1', projectId: 'p1', phase: 'review' });
    const obs = store.createObservation({
      id: 'o1',
      sessionId: 's1',
      type: 'success',
      description: 'TDD worked well',
      lesson: 'Write tests first',
      tags: ['tdd', 'testing'],
      confidence: 0.9,
    });
    expect(obs.type).toBe('success');
    expect(obs.confidence).toBe(0.9);
  });

  it('lists observations for a session', () => {
    store.createProject({ id: 'p1', name: 'App', type: 'saas' });
    store.createSession({ id: 's1', projectId: 'p1', phase: 'review' });
    store.createObservation({
      id: 'o1',
      sessionId: 's1',
      type: 'success',
      description: 'Test 1',
      lesson: 'Lesson 1',
      tags: [],
      confidence: 0.8,
    });
    store.createObservation({
      id: 'o2',
      sessionId: 's1',
      type: 'failure',
      description: 'Test 2',
      lesson: 'Lesson 2',
      tags: [],
      confidence: 0.6,
    });
    const obs = store.listObservations('s1');
    expect(obs.length).toBe(2);
  });
});
