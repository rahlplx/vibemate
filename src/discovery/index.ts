import { createConnection, closeConnection } from '../state/connection.js';
import { runMigrations } from '../state/migrations.js';
import { createStore } from '../state/store.js';
import { buildTree, getNextQuestion, type QuestionTree, type TreeAnswer } from './tree.js';
import { calculateAmbiguityScore, type AmbiguityResult } from './scoring.js';
import { generateDeterministicId } from '../shared/random.js';

export interface DiscoveryResult {
  sessionId: string;
  question: { id: string; text: string; type: string; options?: { value: string; label: string }[] };
  progress: number;
}

export interface DiscoveryEngine {
  startSession(projectId: string, type: string): DiscoveryResult;
  answerQuestion(sessionId: string, questionId: string, value: string): DiscoveryResult | null;
  getSession(sessionId: string): { id: string; phase: string; answers: string } | undefined;
  getProgress(sessionId: string): number;
  getAmbiguity(sessionId: string): AmbiguityResult;
  close(): void;
}

export function createDiscoveryEngine(dbPath: string): DiscoveryEngine {
  const conn = createConnection(dbPath);
  runMigrations(conn);
  const store = createStore(conn);

  const trees = new Map<string, QuestionTree>();
  const answersBySession = new Map<string, TreeAnswer[]>();
  const sessionTypes = new Map<string, string>();

  function getTree(type: string): QuestionTree {
    let tree = trees.get(type);
    if (!tree) {
      tree = buildTree(type);
      trees.set(type, tree);
    }
    return tree;
  }

  return {
    startSession(projectId, type) {
      const existing = store.getProject(projectId);
      if (!existing) {
        store.createProject({
          id: projectId,
          name: `Project ${projectId}`,
          type,
        });
      }

      const session = store.createSession({
        id: generateDeterministicId(`disc-${type}-${projectId}-${Date.now()}-${Math.random().toString(36).slice(2)}`),
        projectId,
        phase: 'discovery',
      });

      const tree = getTree(type);
      answersBySession.set(session.id, []);
      sessionTypes.set(session.id, type);

      const next = getNextQuestion(tree, []);
      if (!next) {
        throw new Error('No questions available for type');
      }

      return {
        sessionId: session.id,
        question: {
          id: next.question.id,
          text: next.question.text,
          type: next.question.type,
          options: next.question.options,
        },
        progress: 0,
      };
    },

    answerQuestion(sessionId, questionId, value) {
      const answers = answersBySession.get(sessionId);
      if (!answers) throw new Error('Session not found');

      answers.push({ questionId, value });

      const session = store.getSession(sessionId);
      if (!session) throw new Error('Session not found in DB');

      store.updateSessionAnswers(
        sessionId,
        answers.map((a) => ({
          questionId: a.questionId,
          value: a.value,
          timestamp: new Date().toISOString(),
        }))
      );

      const sessionType = sessionTypes.get(sessionId) ?? 'saas';
      const tree = getTree(sessionType);
      const next = getNextQuestion(tree, answers);

      if (!next) {
        store.completeSession(sessionId);
        return null;
      }

      const allQuestions = [...tree.questionMap.keys()];
      const progress = (answers.length / allQuestions.length) * 100;

      return {
        sessionId,
        question: {
          id: next.question.id,
          text: next.question.text,
          type: next.question.type,
          options: next.question.options,
        },
        progress: Math.min(100, progress),
      };
    },

    getSession(sessionId) {
      return store.getSession(sessionId);
    },

    getProgress(sessionId) {
      const answers = answersBySession.get(sessionId) ?? [];
      const session = store.getSession(sessionId);
      if (!session) return 0;

      const sessionType = sessionTypes.get(sessionId) ?? 'saas';
      const tree = getTree(sessionType);
      const totalQuestions = tree.questionMap.size;
      return totalQuestions > 0 ? (answers.length / totalQuestions) * 100 : 0;
    },

    getAmbiguity(sessionId) {
      const answers = answersBySession.get(sessionId) ?? [];
      const sessionType = sessionTypes.get(sessionId) ?? 'saas';
      const tree = getTree(sessionType);
      return calculateAmbiguityScore(
        answers.map((a) => {
          const question = tree.questionMap.get(a.questionId);
          const isText = question?.type === 'text';
          const confidence = isText ? 0.5 : 0.9;
          return {
            questionId: a.questionId,
            value: a.value,
            confidence,
            isText,
          };
        })
      );
    },

    close() {
      closeConnection(conn);
    },
  };
}
