import { describe, it, expect, afterEach , beforeEach} from 'bun:test';
import {
  createDiscoveryEngine,
  type DiscoveryEngine,
} from '../../src/discovery/index.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_DIR = path.join(process.cwd(), '.test-discovery');
let engine: DiscoveryEngine;
let projectId: string;

beforeEach(() => {
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  engine = createDiscoveryEngine(path.join(TEST_DB_DIR, 'test.db'));
  projectId = 'p1';
});

afterEach(() => {
  engine.close();
  if (fs.existsSync(TEST_DB_DIR)) {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
  }
});

describe('DiscoveryEngine', () => {
  describe('startSession', () => {
    it('creates a new session and returns first question', () => {
      const result = engine.startSession(projectId, 'saas');
      expect(result.sessionId).toBeTruthy();
      expect(result.question).toBeDefined();
      expect(result.question.id).toBeTruthy();
    });

    it('persists session to database', () => {
      const result = engine.startSession('p1', 'saas');
      const session = engine.getSession(result.sessionId);
      expect(session).toBeDefined();
      expect(session!.phase).toBe('discovery');
    });
  });

  describe('answerQuestion', () => {
    it('records answer and returns next question', () => {
      const { sessionId, question } = engine.startSession('p1', 'saas');
      const next = engine.answerQuestion(sessionId, question.id, 'SaaS platform');
      expect(next).toBeDefined();
      expect(next!.question).toBeDefined();
    });

    it('completes session when all questions answered', () => {
      const { sessionId } = engine.startSession('p1', 'cli');
      let current = engine.answerQuestion(sessionId, 'cli-purpose', 'CLI tool');
      while (current) {
        current = engine.answerQuestion(
          sessionId,
          current.question.id,
          'default'
        );
      }
      const session = engine.getSession(sessionId);
      expect(session!.phase).toBe('complete');
    });
  });

  describe('getProgress', () => {
    it('returns progress percentage', () => {
      const { sessionId } = engine.startSession('p1', 'saas');
      const progress = engine.getProgress(sessionId);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(100);
    });
  });

  describe('getAmbiguity', () => {
    it('returns ambiguity score', () => {
      const { sessionId, question } = engine.startSession('p1', 'saas');
      engine.answerQuestion(sessionId, question.id, 'SaaS platform');
      const ambiguity = engine.getAmbiguity(sessionId);
      expect(ambiguity.score).toBeGreaterThanOrEqual(0);
      expect(ambiguity.score).toBeLessThanOrEqual(1);
    });
  });
});
