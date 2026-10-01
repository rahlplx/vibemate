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
    const options = question.options;
    for (let i = 0; i < options.length; i++) {
      const option = options[i];
      // Avoid spread operator in recursion path array
      const nextPath = path.slice();
      nextPath.push({ questionId: question.id, value: option.value });
      const childNodes = buildBranches(questions, startIndex + 1, nextPath);
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
  // Populate answer Map directly with indexed loop to avoid intermediate 2D array allocations from answers.map(...)
  const answerMap = new Map<string, string>();
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    answerMap.set(a.questionId, a.value);
  }

  let current: TreeNode | null = tree.root;

  while (current) {
    const question = tree.questionMap.get(current.questionId);
    if (!question) return null;

    const answer = answerMap.get(current.questionId);
    const children = current.children;
    const len = children.length;

    if (len === 0) {
      if (answer === undefined) {
        return { nodeId: current.id, question };
      }
      return null;
    }

    if (answer === undefined) {
      return { nodeId: current.id, question };
    }

    // Single-pass indexed loop to find matching child node without closure creation
    let matchingChild: TreeNode | null = null;
    for (let i = 0; i < len; i++) {
      const child = children[i];
      if (child.condition?.value === answer) {
        matchingChild = child;
        break;
      }
    }

    if (!matchingChild) {
      const fallback = children[0];
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
  const stack: TreeNode[] = [tree.root];

  // Iterative stack traversal to avoid recursive function call overhead
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node.id)) continue;
    visited.add(node.id);

    const question = tree.questionMap.get(node.questionId);
    if (question) result.push(question);

    const children = node.children;
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push(children[i]);
    }
  }

  return result;
}
