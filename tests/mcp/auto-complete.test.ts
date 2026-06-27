import { describe, it, expect } from 'bun:test';
import {
  createAutoComplete,
  type Suggestion,
  type SuggestionRequest,
  AUTO_COMPLETE,
} from '../../src/mcp/tools/auto-complete.js';

describe('AutoComplete', () => {
  const ac = createAutoComplete();

  describe('Suggestion types', () => {
    it('has all required suggestion types', () => {
      expect(AUTO_COMPLETE.SUGGESTION_TYPES).toContain('spec_section');
      expect(AUTO_COMPLETE.SUGGESTION_TYPES).toContain('tech_stack');
      expect(AUTO_COMPLETE.SUGGESTION_TYPES).toContain('feature');
      expect(AUTO_COMPLETE.SUGGESTION_TYPES).toContain('risk_flag');
    });

    it('each suggestion has required fields', () => {
      const suggestion: Suggestion = {
        type: 'spec_section',
        label: 'Test',
        description: 'A test suggestion',
        confidence: 0.8,
        action: 'insert',
      };
      expect(suggestion.type).toBe('spec_section');
      expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
      expect(suggestion.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('suggest', () => {
    it('returns suggestions for auth-related query', () => {
      const results = ac.suggest({ query: 'auth' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((s) => s.label.toLowerCase().includes('auth'))).toBe(true);
    });

    it('returns suggestions for payment-related query', () => {
      const results = ac.suggest({ query: 'payment' });
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((s) => s.label.toLowerCase().includes('payment'))).toBe(true);
    });

    it('returns trending suggestions for empty query', () => {
      const results = ac.suggest({ query: '' });
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns empty array for nonsense query', () => {
      const results = ac.suggest({ query: 'xyzzyzzy' });
      expect(results.length).toBe(0);
    });

    it('includes confidence scores in results', () => {
      const results = ac.suggest({ query: 'api' });
      for (const s of results) {
        expect(s.confidence).toBeGreaterThan(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('returns top 5 suggestions max', () => {
      const results = ac.suggest({ query: 'app' });
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('handles context with idea', () => {
      const results = ac.suggest({
        query: 'todo',
        context: { idea: 'a todo app with teams', stack: 'nextjs' },
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('returns different results for different queries', () => {
      const auth = ac.suggest({ query: 'auth' });
      const todo = ac.suggest({ query: 'todo' });
      if (auth.length > 0 && todo.length > 0) {
        const authLabels = auth.map((s) => s.label).join(',');
        const todoLabels = todo.map((s) => s.label).join(',');
        expect(authLabels).not.toBe(todoLabels);
      }
    });
  });

  describe('getSuggestions', () => {
    it('returns all available suggestions', () => {
      const all = ac.getSuggestions();
      expect(all.length).toBeGreaterThan(0);
    });
  });
});
