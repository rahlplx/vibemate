import { getQuestionsForType, type Question } from './questions.js';

export interface TreeAnswer {
  questionId: string;
  value: string;
}

export interface TreeNode {
  id: string;
  questionId: string;
  condition?: {
    questionId: string;
    value: string;
  };
  children: TreeNode[];
}

export interface QuestionTree {
  root: TreeNode;
  questionMap: Map<string, Question>;
}

export function buildTree(type: string): QuestionTree {
  const questions = getQuestionsForType(type);
  const questionMap = new Map<string, Question>();

  for (const q of questions) {
    questionMap.set(q.id, q);
  }

  const root: TreeNode = {
    id: 'root',
    questionId: questions[0]?.id ?? 'unknown',
    children: buildBranches(questions, 1, []),
  };

  return { root, questionMap };
}

function buildBranches(
  questions: Question[],
  startIndex: number,
  path: TreeAnswer[]
): TreeNode[] {
  if (startIndex >= questions.length) return [];

  const question = questions[startIndex];
  if (!question) return [];

  if (question.followUp && question.options) {
    const children: TreeNode[] = [];
    for (const option of question.options) {
      const childNodes = buildBranches(questions, startIndex + 1, [...path, { questionId: question.id, value: option.value }]);
      if (childNodes.length > 0) {
        children.push({
          id: `node-${startIndex}-${option.value}`,
          questionId: question.id,
          condition: { questionId: question.id, value: option.value },
          children: childNodes,
        });
      }
    }
    if (children.length > 0) return children;
  }

  const node: TreeNode = {
    id: `node-${startIndex}`,
    questionId: question.id,
    children: buildBranches(questions, startIndex + 1, path),
  };

  return [node];
}

export function getNextQuestion(
  tree: QuestionTree,
  answers: TreeAnswer[]
): { nodeId: string; question: Question } | null {
  const answerMap = new Map(answers.map((a) => [a.questionId, a.value]));
  let current = tree.root;

  while (current) {
    const question = tree.questionMap.get(current.questionId);
    if (!question) return null;

    const answer = answerMap.get(current.questionId);

    if (current.children.length === 0) {
      if (answer === undefined) {
        return { nodeId: current.id, question };
      }
      return null;
    }

    if (answer === undefined) {
      return { nodeId: current.id, question };
    }

    const matchingChild = current.children.find(
      (child) => child.condition?.value === answer
    );

    if (!matchingChild) {
      const fallback = current.children[0];
      if (fallback) {
        current = fallback;
        continue;
      }
      return null;
    }

    current = matchingChild;
  }

  return null;
}

export function getAllQuestions(tree: QuestionTree): Question[] {
  const visited = new Set<string>();
  const result: Question[] = [];

  function traverse(node: TreeNode) {
    if (visited.has(node.id)) return;
    visited.add(node.id);

    const question = tree.questionMap.get(node.questionId);
    if (question) result.push(question);

    for (const child of node.children) {
      traverse(child);
    }
  }

  traverse(tree.root);
  return result;
}
