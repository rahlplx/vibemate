import { z } from 'zod';

// Project types supported by Vibemate
export const ProjectTypeSchema = z.enum(['saas', 'static', 'cli', 'mobile', 'api']);
export type ProjectType = z.infer<typeof ProjectTypeSchema>;

// Question types for discovery engine
export const QuestionTypeSchema = z.enum(['choice', 'text', 'boolean', 'scale']);
export type QuestionType = z.infer<typeof QuestionTypeSchema>;

// A single question in the discovery tree
export const QuestionSchema = z
  .object({
    id: z.string(),
    text: z.string(),
    type: QuestionTypeSchema,
    options: z.array(z.string()).optional(),
    required: z.boolean().default(true),
    category: z.string(),
    followUp: z.string().optional(),
    condition: z.string().optional(),
  })
  .refine(
    (q) => q.type !== 'choice' || (q.options && q.options.length > 0),
    { message: 'Choice questions must have at least one option' }
  );
export type Question = z.infer<typeof QuestionSchema>;

// User answer to a question
export const AnswerSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  timestamp: z.string(),
});
export type Answer = z.infer<typeof AnswerSchema>;

// A decision recorded during discovery/planning
export const DecisionSchema = z.object({
  id: z.string(),
  category: z.string(),
  question: z.string(),
  answer: z.string(),
  rationale: z.string(),
  timestamp: z.string(),
  hash: z.string(),
  previousHash: z.string().optional(),
});
export type Decision = z.infer<typeof DecisionSchema>;

// Project brief - the output of discovery
export const ProjectBriefSchema = z.object({
  id: z.string(),
  projectName: z.string(),
  projectType: ProjectTypeSchema,
  description: z.string(),
  goals: z.array(z.string()),
  techStack: z.record(z.string(), z.string()),
  decisions: z.array(DecisionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProjectBrief = z.infer<typeof ProjectBriefSchema>;

// Comparison matrix for decision engine
export const ComparisonMatrixSchema = z
  .object({
    id: z.string(),
    category: z.string(),
    criteria: z.array(z.string()),
    options: z.array(
      z.object({
        name: z.string(),
        scores: z.record(z.string(), z.number()),
      })
    ),
    weights: z.record(z.string(), z.number()),
    recommendation: z.string(),
    createdAt: z.string(),
  })
  .refine((m) => m.options.length >= 2, {
    message: 'Comparison matrix must have at least 2 options',
  });
export type ComparisonMatrix = z.infer<typeof ComparisonMatrixSchema>;

// Scaffold template configuration
export const ScaffoldTemplateSchema = z.object({
  id: z.string(),
  projectType: ProjectTypeSchema,
  name: z.string(),
  description: z.string(),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
      template: z.boolean().default(false),
    })
  ),
  directories: z.array(z.string()),
});
export type ScaffoldTemplate = z.infer<typeof ScaffoldTemplateSchema>;

// Execution task
export const ExecutionTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']),
  complexityScore: z.number(),
  executionMode: z.enum(['inline', 'session', 'subagent']),
  output: z.string().optional(),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});
export type ExecutionTask = z.infer<typeof ExecutionTaskSchema>;

// Learning observation from self-improvement
export const ObservationSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  type: z.enum(['success', 'failure', 'anti-pattern', 'insight']),
  description: z.string(),
  lesson: z.string(),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  createdAt: z.string(),
});
export type Observation = z.infer<typeof ObservationSchema>;

// Audit trail entry
export const AuditEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  projectId: z.string(),
  phase: z.string(),
  action: z.string(),
  details: z.record(z.unknown()),
  previousHash: z.string().optional(),
  hash: z.string(),
});
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
