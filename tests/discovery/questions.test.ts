import { describe, it, expect } from 'bun:test';
import {
  QuestionBank,
  getQuestionsForType,
  getQuestionById,
  type Question,
} from '../../src/discovery/questions.js';

describe('QuestionBank', () => {
  describe('getQuestionsForType', () => {
    it('returns questions for saas type', () => {
      const questions = getQuestionsForType('saas');
      expect(questions.length).toBeGreaterThanOrEqual(5);
      expect(questions[0]).toHaveProperty('id');
      expect(questions[0]).toHaveProperty('text');
      expect(questions[0]).toHaveProperty('type');
    });

    it('returns questions for cli type', () => {
      const questions = getQuestionsForType('cli');
      expect(questions.length).toBeGreaterThanOrEqual(3);
    });

    it('returns questions for api type', () => {
      const questions = getQuestionsForType('api');
      expect(questions.length).toBeGreaterThanOrEqual(3);
    });

    it('returns questions for mobile type', () => {
      const questions = getQuestionsForType('mobile');
      expect(questions.length).toBeGreaterThanOrEqual(3);
    });

    it('returns questions for static type', () => {
      const questions = getQuestionsForType('static');
      expect(questions.length).toBeGreaterThanOrEqual(3);
    });

    it('returns empty array for unknown type', () => {
      const questions = getQuestionsForType('unknown');
      expect(questions).toEqual([]);
    });
  });

  describe('getQuestionById', () => {
    it('finds a question by id', () => {
      const questions = getQuestionsForType('saas');
      const first = questions[0];
      const found = getQuestionById(first.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(first.id);
    });

    it('returns undefined for non-existent id', () => {
      const found = getQuestionById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('Question structure', () => {
    it('each question has required fields', () => {
      const allQuestions = [
        ...getQuestionsForType('saas'),
        ...getQuestionsForType('cli'),
        ...getQuestionsForType('api'),
        ...getQuestionsForType('mobile'),
        ...getQuestionsForType('static'),
      ];

      for (const q of allQuestions) {
        expect(q.id).toBeTruthy();
        expect(q.text).toBeTruthy();
        expect(q.type).toMatch(/^(single|multi|text)$/);
        if (q.options) {
          expect(q.options.length).toBeGreaterThan(0);
        }
      }
    });

    it('question ids are unique', () => {
      const allQuestions = [
        ...getQuestionsForType('saas'),
        ...getQuestionsForType('cli'),
        ...getQuestionsForType('api'),
        ...getQuestionsForType('mobile'),
        ...getQuestionsForType('static'),
      ];
      const ids = allQuestions.map((q) => q.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
