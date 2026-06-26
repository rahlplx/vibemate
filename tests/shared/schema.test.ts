import { describe, it, expect } from 'vitest';
import {
  ProjectTypeSchema,
  QuestionSchema,
  AnswerSchema,
  DecisionSchema,
  ProjectBriefSchema,
  ComparisonMatrixSchema,
  type ProjectType,
  type Question,
  type Answer,
  type Decision,
  type ProjectBrief,
  type ComparisonMatrix,
} from '../../src/shared/schema.js';

describe('ProjectTypeSchema', () => {
  it('accepts valid project types', () => {
    expect(ProjectTypeSchema.parse('saas')).toBe('saas');
    expect(ProjectTypeSchema.parse('static')).toBe('static');
    expect(ProjectTypeSchema.parse('cli')).toBe('cli');
    expect(ProjectTypeSchema.parse('mobile')).toBe('mobile');
    expect(ProjectTypeSchema.parse('api')).toBe('api');
  });

  it('rejects invalid project types', () => {
    expect(() => ProjectTypeSchema.parse('invalid')).toThrow();
    expect(() => ProjectTypeSchema.parse('')).toThrow();
    expect(() => ProjectTypeSchema.parse(123)).toThrow();
  });
});

describe('QuestionSchema', () => {
  it('accepts valid question', () => {
    const q = {
      id: 'q1',
      text: 'What are you building?',
      type: 'choice' as const,
      options: ['SaaS', 'Static Site', 'CLI'],
      required: true,
      category: 'project-type',
    };
    expect(QuestionSchema.parse(q)).toEqual(q);
  });

  it('rejects question without id', () => {
    expect(() => QuestionSchema.parse({ text: 'test' })).toThrow();
  });

  it('rejects question without options for choice type', () => {
    expect(() =>
      QuestionSchema.parse({
        id: 'q1',
        text: 'test',
        type: 'choice',
        required: true,
        category: 'test',
      })
    ).toThrow();
  });
});

describe('AnswerSchema', () => {
  it('accepts valid answer', () => {
    const a = {
      questionId: 'q1',
      value: 'SaaS',
      timestamp: '2026-06-27T00:00:00Z',
    };
    expect(AnswerSchema.parse(a)).toEqual(a);
  });

  it('accepts numeric answer', () => {
    const a = {
      questionId: 'q2',
      value: 5,
      timestamp: '2026-06-27T00:00:00Z',
    };
    expect(AnswerSchema.parse(a)).toEqual(a);
  });

  it('rejects answer without questionId', () => {
    expect(() => AnswerSchema.parse({ value: 'test' })).toThrow();
  });
});

describe('DecisionSchema', () => {
  it('accepts valid decision', () => {
    const d = {
      id: 'd1',
      category: 'database',
      question: 'Which database?',
      answer: 'SQLite',
      rationale: 'Local-first, zero config',
      timestamp: '2026-06-27T00:00:00Z',
      hash: 'abc123',
      previousHash: 'def456',
    };
    expect(DecisionSchema.parse(d)).toEqual(d);
  });

  it('rejects decision without required fields', () => {
    expect(() => DecisionSchema.parse({ id: 'd1' })).toThrow();
  });
});

describe('ProjectBriefSchema', () => {
  it('accepts valid brief', () => {
    const brief = {
      id: 'b1',
      projectName: 'My App',
      projectType: 'saas' as const,
      description: 'A cool SaaS app',
      goals: ['Build fast', 'Scale well'],
      techStack: { runtime: 'bun', database: 'sqlite' },
      decisions: [],
      createdAt: '2026-06-27T00:00:00Z',
      updatedAt: '2026-06-27T00:00:00Z',
    };
    expect(ProjectBriefSchema.parse(brief)).toEqual(brief);
  });

  it('rejects brief without projectName', () => {
    expect(() =>
      ProjectBriefSchema.parse({ projectType: 'saas' })
    ).toThrow();
  });
});

describe('ComparisonMatrixSchema', () => {
  it('accepts valid matrix', () => {
    const m = {
      id: 'm1',
      category: 'database',
      criteria: ['cost', 'performance', 'scalability'],
      options: [
        { name: 'SQLite', scores: { cost: 9, performance: 8, scalability: 5 } },
        { name: 'PostgreSQL', scores: { cost: 6, performance: 7, scalability: 9 } },
      ],
      weights: { cost: 0.3, performance: 0.4, scalability: 0.3 },
      recommendation: 'PostgreSQL',
      createdAt: '2026-06-27T00:00:00Z',
    };
    expect(ComparisonMatrixSchema.parse(m)).toEqual(m);
  });

  it('rejects matrix with empty options', () => {
    expect(() =>
      ComparisonMatrixSchema.parse({
        id: 'm1',
        category: 'test',
        criteria: ['x'],
        options: [],
        weights: { x: 1.0 },
        recommendation: '',
        createdAt: '',
      })
    ).toThrow();
  });
});
