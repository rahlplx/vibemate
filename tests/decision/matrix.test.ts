import { describe, it, expect } from 'bun:test';
import {
  ComparisonMatrix,
  createMatrix,
  addOption,
  addCriteria,
  scoreOption,
  getWinner,
  type MatrixOption,
  type MatrixCriteria,
} from '../../src/decision/matrix.js';

describe('ComparisonMatrix', () => {
  describe('createMatrix', () => {
    it('creates an empty matrix', () => {
      const matrix = createMatrix('db-choice');
      expect(matrix.id).toBe('db-choice');
      expect(matrix.options).toEqual([]);
      expect(matrix.criteria).toEqual([]);
    });
  });

  describe('addOption', () => {
    it('adds an option to the matrix', () => {
      const matrix = createMatrix('db-choice');
      const updated = addOption(matrix, {
        id: 'sqlite',
        name: 'SQLite',
        description: 'Local-first SQL',
      });
      expect(updated.options.length).toBe(1);
      expect(updated.options[0].id).toBe('sqlite');
    });
  });

  describe('addCriteria', () => {
    it('adds criteria with weight', () => {
      const matrix = createMatrix('db-choice');
      const updated = addCriteria(matrix, {
        id: 'performance',
        name: 'Performance',
        weight: 0.8,
      });
      expect(updated.criteria.length).toBe(1);
      expect(updated.criteria[0].weight).toBe(0.8);
    });
  });

  describe('scoreOption', () => {
    it('scores an option against criteria', () => {
      let matrix = createMatrix('db-choice');
      matrix = addOption(matrix, { id: 'sqlite', name: 'SQLite', description: '' });
      matrix = addCriteria(matrix, { id: 'perf', name: 'Performance', weight: 1.0 });

      const scored = scoreOption(matrix, 'sqlite', { perf: 0.9 });
      expect(scored.options[0].scores).toEqual({ perf: 0.9 });
    });

    it('calculates weighted score', () => {
      let matrix = createMatrix('db-choice');
      matrix = addOption(matrix, { id: 'sqlite', name: 'SQLite', description: '' });
      matrix = addCriteria(matrix, { id: 'perf', name: 'Performance', weight: 0.5 });
      matrix = addCriteria(matrix, { id: 'cost', name: 'Cost', weight: 0.5 });

      const scored = scoreOption(matrix, 'sqlite', { perf: 0.8, cost: 0.6 });
      expect(scored.options[0].weightedScore).toBeCloseTo(0.7);
    });
  });

  describe('getWinner', () => {
    it('returns the highest scored option', () => {
      let matrix = createMatrix('db-choice');
      matrix = addOption(matrix, { id: 'sqlite', name: 'SQLite', description: '' });
      matrix = addOption(matrix, { id: 'postgres', name: 'PostgreSQL', description: '' });
      matrix = addCriteria(matrix, { id: 'perf', name: 'Performance', weight: 1.0 });

      matrix = scoreOption(matrix, 'sqlite', { perf: 0.6 });
      matrix = scoreOption(matrix, 'postgres', { perf: 0.9 });

      const winner = getWinner(matrix);
      expect(winner).toBeDefined();
      expect(winner!.id).toBe('postgres');
    });

    it('returns undefined for empty matrix', () => {
      const matrix = createMatrix('empty');
      expect(getWinner(matrix)).toBeUndefined();
    });
  });
});
