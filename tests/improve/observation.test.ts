import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createObservationEngine,
  type ObservationEngine,
} from '../../src/improve/observation.js';
import { createConnection, closeConnection, type DatabaseConnection } from '../../src/state/connection.js';
import { runMigrations } from '../../src/state/migrations.js';
import { createStore, type StateStore } from '../../src/state/store.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_DIR = path.join(process.cwd(), '.test-observation');
let engine: ObservationEngine;
let store: StateStore;
let conn: DatabaseConnection;

beforeEach(() => {
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  conn = createConnection(path.join(TEST_DB_DIR, 'test.db'));
  runMigrations(conn);
  store = createStore(conn);
  store.createProject({ id: 'p1', name: 'Test', type: 'saas' });
  store.createSession({ id: 's1', projectId: 'p1', phase: 'review' });
  engine = createObservationEngine(path.join(TEST_DB_DIR, 'test.db'));
});

afterEach(() => {
  engine.close();
  closeConnection(conn);
  if (fs.existsSync(TEST_DB_DIR)) {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
  }
});

describe('ObservationEngine', () => {
  describe('recordObservation', () => {
    it('records an observation', () => {
      const id = engine.recordObservation('s1', {
        type: 'success',
        description: 'TDD worked well',
        lesson: 'Write tests first',
        tags: ['tdd', 'testing'],
        confidence: 0.9,
      });
      expect(id).toBeTruthy();
    });

    it('persists to database', () => {
      const id = engine.recordObservation('s1', {
        type: 'success',
        description: 'Test',
        lesson: 'Lesson',
        tags: [],
        confidence: 0.8,
      });
      const obs = engine.getObservation(id);
      expect(obs).toBeDefined();
      expect(obs!.type).toBe('success');
    });
  });

  describe('getObservations', () => {
    it('returns observations for session', () => {
      engine.recordObservation('s1', {
        type: 'success',
        description: 'Test 1',
        lesson: 'Lesson 1',
        tags: [],
        confidence: 0.8,
      });
      engine.recordObservation('s1', {
        type: 'failure',
        description: 'Test 2',
        lesson: 'Lesson 2',
        tags: [],
        confidence: 0.6,
      });
      const obs = engine.getObservations('s1');
      expect(obs.length).toBe(2);
    });
  });

  describe('getInsights', () => {
    it('returns high-confidence observations', () => {
      engine.recordObservation('s1', {
        type: 'success',
        description: 'High confidence',
        lesson: 'Lesson',
        tags: ['important'],
        confidence: 0.95,
      });
      engine.recordObservation('s1', {
        type: 'success',
        description: 'Low confidence',
        lesson: 'Lesson',
        tags: [],
        confidence: 0.5,
      });
      const insights = engine.getInsights();
      expect(insights.length).toBe(1);
      expect(insights[0].confidence).toBeGreaterThanOrEqual(0.9);
    });
  });
});
