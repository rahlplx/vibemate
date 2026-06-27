import { describe, it, expect } from 'bun:test';
import {
  QuestionTree,
  buildTree,
  getNextQuestion,
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
});
