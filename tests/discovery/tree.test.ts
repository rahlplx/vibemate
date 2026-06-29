import { describe, it, expect } from 'bun:test';
import {
  QuestionTree,
  buildTree,
  getNextQuestion,
  getAllQuestions,
  type TreeNode,
  type TreeAnswer,
} from '../../src/discovery/tree.js';
import { getQuestionById } from '../../src/discovery/questions.js';

describe('QuestionTree', () => {
  const sampleTree: QuestionTree = {
    root: {
      id: 'root',
      questionId: 'saas-purpose',
      children: [
        {
          id: 'branch-a',
          questionId: 'saas-users',
          condition: { questionId: 'saas-purpose', value: 'productivity' },
          children: [
            {
              id: 'leaf-a1',
              questionId: 'saas-auth',
              condition: { questionId: 'saas-users', value: 'developers' },
              children: [],
            },
          ],
        },
        {
          id: 'branch-b',
          questionId: 'saas-auth',
          condition: { questionId: 'saas-purpose', value: 'ecommerce' },
          children: [],
        },
      ],
    },
    questionMap: new Map([
      ['saas-purpose', getQuestionById('saas-purpose')!],
      ['saas-users', getQuestionById('saas-users')!],
      ['saas-auth', getQuestionById('saas-auth')!],
    ]),
  };

  describe('buildTree', () => {
    it('creates a tree with root node', () => {
      const tree = buildTree('saas');
      expect(tree).toBeDefined();
      expect(tree.root).toBeDefined();
      expect(tree.root.questionId).toBeTruthy();
    });

    it('tree has children', () => {
      const tree = buildTree('saas');
      expect(tree.root.children.length).toBeGreaterThan(0);
    });
  });

  describe('getNextQuestion', () => {
    it('returns root question when no answers', () => {
      const next = getNextQuestion(sampleTree, []);
      expect(next).toBeDefined();
      expect(next!.nodeId).toBe('root');
    });

    it('returns correct branch based on answer', () => {
      const answers: TreeAnswer[] = [
        { questionId: 'saas-purpose', value: 'productivity' },
      ];
      const next = getNextQuestion(sampleTree, answers);
      expect(next).toBeDefined();
      expect(next!.nodeId).toBe('branch-a');
    });

    it('returns different branch for different answer', () => {
      const answers: TreeAnswer[] = [
        { questionId: 'saas-purpose', value: 'ecommerce' },
      ];
      const next = getNextQuestion(sampleTree, answers);
      expect(next).toBeDefined();
      expect(next!.nodeId).toBe('branch-b');
    });

    it('returns null when path is complete', () => {
      const answers: TreeAnswer[] = [
        { questionId: 'saas-purpose', value: 'ecommerce' },
        { questionId: 'saas-auth', value: 'jwt' },
      ];
      const next = getNextQuestion(sampleTree, answers);
      expect(next).toBeNull();
    });

    it('traverses nested branches', () => {
      const answers: TreeAnswer[] = [
        { questionId: 'saas-purpose', value: 'productivity' },
        { questionId: 'saas-users', value: 'developers' },
      ];
      const next = getNextQuestion(sampleTree, answers);
      expect(next).toBeDefined();
      expect(next!.nodeId).toBe('leaf-a1');
    });
  });

  describe('Tree traversal', () => {
    it('collects all visited nodes', () => {
      const tree = buildTree('cli');
      const first = getNextQuestion(tree, []);
      expect(first).toBeDefined();
      expect(first!.nodeId).toBe('root');
    });
  });

  describe('getNextQuestion fallback child', () => {
    it('uses first child when answer does not match any branch condition', () => {
      // Tree where root has a child with a condition, but we answer something else
      const tree: QuestionTree = {
        root: {
          id: 'root',
          questionId: 'saas-purpose',
          children: [
            {
              id: 'only-branch',
              questionId: 'saas-users',
              condition: { questionId: 'saas-purpose', value: 'specific-value' },
              children: [],
            },
          ],
        },
        questionMap: new Map([
          ['saas-purpose', getQuestionById('saas-purpose')!],
          ['saas-users', getQuestionById('saas-users')!],
        ]),
      };
      // Answer doesn't match 'specific-value', so fallback to first child
      const answers: TreeAnswer[] = [
        { questionId: 'saas-purpose', value: 'no-matching-value' },
      ];
      const next = getNextQuestion(tree, answers);
      expect(next).toBeDefined();
      expect(next!.nodeId).toBe('only-branch');
    });

    it('returns null when no matching child and no fallback exists', () => {
      const tree: QuestionTree = {
        root: {
          id: 'root',
          questionId: 'saas-purpose',
          children: [],
        },
        questionMap: new Map([
          ['saas-purpose', getQuestionById('saas-purpose')!],
        ]),
      };
      // Root has no children; already answered → path complete → null
      const answers: TreeAnswer[] = [
        { questionId: 'saas-purpose', value: 'productivity' },
      ];
      const next = getNextQuestion(tree, answers);
      expect(next).toBeNull();
    });

    it('returns null when current node questionId is missing from questionMap', () => {
      const tree: QuestionTree = {
        root: {
          id: 'root',
          questionId: 'missing-question-id',
          children: [],
        },
        questionMap: new Map(),
      };
      const next = getNextQuestion(tree, []);
      expect(next).toBeNull();
    });
  });

  describe('buildTree edge cases', () => {
    it('produces a tree for unknown type using empty question set', () => {
      // 'unknown-type' has no questions; root questionId should be 'unknown'
      const tree = buildTree('unknown-type-xyz');
      expect(tree).toBeDefined();
      expect(tree.root).toBeDefined();
    });
  });

  describe('getAllQuestions', () => {
    it('returns all unique questions in tree', () => {
      const tree = buildTree('saas');
      const questions = getAllQuestions(tree);
      expect(Array.isArray(questions)).toBe(true);
      expect(questions.length).toBeGreaterThan(0);
    });

    it('includes root question', () => {
      const questions = getAllQuestions(sampleTree);
      const ids = questions.map(q => q.id);
      expect(ids).toContain('saas-purpose');
    });

    it('does not duplicate visited nodes', () => {
      const tree = buildTree('saas');
      const questions = getAllQuestions(tree);
      const ids = questions.map(q => q.id);
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });
  });
});
