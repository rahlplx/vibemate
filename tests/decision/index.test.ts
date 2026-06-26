import { describe, it, expect } from 'vitest';
import {
  createDecisionEngine,
  type DecisionEngine,
} from '../../src/decision/index.js';
import * as fs from 'fs';
import * as path from 'path';

const TEST_DB_DIR = path.join(process.cwd(), '.test-decision');
let engine: DecisionEngine;

beforeEach(() => {
  fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  engine = createDecisionEngine(path.join(TEST_DB_DIR, 'test.db'));
});

afterEach(() => {
  engine.close();
  if (fs.existsSync(TEST_DB_DIR)) {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
  }
});

describe('DecisionEngine', () => {
  describe('getOptions', () => {
    it('returns options for a category', () => {
      const options = engine.getOptions('database');
      expect(options.length).toBeGreaterThan(0);
      expect(options[0]).toHaveProperty('id');
      expect(options[0]).toHaveProperty('name');
    });

    it('returns empty for unknown category', () => {
      const options = engine.getOptions('unknown');
      expect(options).toEqual([]);
    });
  });

  describe('createComparison', () => {
    it('creates a comparison matrix', () => {
      const matrix = engine.createComparison('database', ['sqlite', 'postgresql']);
      expect(matrix).toBeDefined();
      expect(matrix.options.length).toBe(2);
      expect(matrix.criteria.length).toBeGreaterThan(0);
    });
  });

  describe('rankOptions', () => {
    it('returns ranked options', () => {
      const ranked = engine.rankOptions('database', ['sqlite', 'postgresql']);
      expect(ranked.length).toBe(2);
      expect(ranked[0].totalScore).toBeGreaterThanOrEqual(ranked[1].totalScore);
    });
  });

  describe('getRecommendation', () => {
    it('returns a recommendation', () => {
      const rec = engine.getRecommendation('database', ['sqlite', 'postgresql']);
      expect(rec).toBeDefined();
      expect(rec.winner).toBeDefined();
      expect(rec.alternatives.length).toBeGreaterThan(0);
    });
  });
});
