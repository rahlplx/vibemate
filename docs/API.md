# Vibemate API Documentation

## Overview

Vibemate provides a modular API for building AI-native products. This documentation covers the core modules available in the open source version.

## Modules

### 1. Discovery Engine

The Discovery Engine provides adaptive brainstorming with unlimited questions until zero ambiguity.

#### Types

```typescript
interface Question {
  id: string;
  type: 'text' | 'select' | 'multiselect' | 'confirm';
  message: string;
  options?: string[];
  validate?: (input: string) => boolean | string;
}

interface QuestionTree {
  nodes: Map<string, Question>;
  edges: Map<string, string[]>;
  root: string;
}

interface AmbiguityScore {
  score: number; // 0-1, where 0 is clear, 1 is ambiguous
  level: 'clear' | 'moderate' | 'high';
  reasons: string[];
}
```

#### Usage

```typescript
import { DiscoveryEngine } from '@vibemate/core/discovery';

const engine = new DiscoveryEngine();

// Start a discovery session
const session = await engine.start('saas');

// Get next question
const question = engine.getNextQuestion(session);

// Submit answer
const updatedSession = engine.submitAnswer(session, question.id, answer);

// Check ambiguity
const score = engine.getAmbiguityScore(updatedSession);

// Get project brief
const brief = engine.getProjectBrief(updatedSession);
```

### 2. Decision Engine

The Decision Engine provides technology comparison with weighted scoring and benchmark data.

#### Types

```typescript
interface Criterion {
  name: string;
  weight: number; // 0-1
  description: string;
}

interface Option {
  name: string;
  scores: Record<string, number>; // criterion name -> score (0-10)
  benchmarks: Record<string, number>; // metric -> value
}

interface ComparisonResult {
  options: Option[];
  rankings: { option: string; score: number }[];
  recommendation: string;
}
```

#### Usage

```typescript
import { DecisionEngine } from '@vibemate/core/decision';

const engine = new DecisionEngine();

// Create comparison matrix
const matrix = engine.createMatrix({
  criteria: [
    { name: 'performance', weight: 0.3, description: 'Requests per second' },
    { name: 'cost', weight: 0.3, description: 'Monthly cost' },
    { name: 'ease', weight: 0.4, description: 'Learning curve' }
  ],
  options: [
    { name: 'Node.js', scores: { performance: 7, cost: 8, ease: 9 } },
    { name: 'Go', scores: { performance: 9, cost: 7, ease: 5 } }
  ]
});

// Get rankings
const rankings = engine.rankOptions(matrix);

// Get recommendation
const recommendation = engine.getRecommendation(matrix);
```

### 3. Scaffold Generator

The Scaffold Generator provides project scaffolding with templates for SaaS, API, CLI.

#### Types

```typescript
interface Template {
  name: string;
  description: string;
  files: TemplateFile[];
  variables: TemplateVariable[];
}

interface TemplateFile {
  path: string;
  content: string;
  template: boolean;
}

interface TemplateVariable {
  name: string;
  type: 'string' | 'boolean' | 'number';
  default?: unknown;
  description: string;
}

interface ScaffoldOptions {
  template: string;
  variables: Record<string, unknown>;
  outputDir: string;
}
```

#### Usage

```typescript
import { ScaffoldGenerator } from '@vibemate/core/scaffold';

const generator = new ScaffoldGenerator();

// List available templates
const templates = generator.listTemplates();

// Generate project
const result = await generator.generate({
  template: 'saas',
  variables: {
    projectName: 'my-app',
    description: 'My SaaS application',
    author: 'John Doe'
  },
  outputDir: './my-app'
});

// Custom template
const customTemplate: Template = {
  name: 'custom',
  description: 'Custom template',
  files: [
    { path: 'package.json', content: '{}', template: true }
  ],
  variables: []
};
```

### 4. Execution Gate

The Execution Gate provides complexity-based routing for task dispatch.

#### Types

```typescript
interface Task {
  id: string;
  description: string;
  complexity: number; // 0-100
  dependencies: string[];
  estimatedTime: number; // minutes
}

interface ExecutionPlan {
  tasks: Task[];
  routes: { taskId: string; route: 'inline' | 'session' | 'subagent' }[];
  estimatedTotalTime: number;
}
```

#### Usage

```typescript
import { ExecutionGate } from '@vibemate/core/execution';

const gate = new ExecutionGate();

// Analyze task complexity
const complexity = gate.analyzeComplexity({
  description: 'Implement user authentication with OAuth',
  files: ['src/auth.ts', 'src/routes.ts'],
  dependencies: ['express', 'passport']
});

// Create execution plan
const plan = gate.createPlan([
  { id: '1', description: 'Setup project', complexity: 20 },
  { id: '2', description: 'Implement auth', complexity: 60 },
  { id: '3', description: 'Add tests', complexity: 30 }
]);

// Get route for task
const route = gate.getRoute(plan, '2'); // 'session' or 'subagent'
```

### 5. Self-Improvement Engine

The Self-Improvement Engine provides observation recording and insights.

#### Types

```typescript
interface Observation {
  id: string;
  timestamp: string;
  type: 'success' | 'failure' | 'insight';
  description: string;
  context: Record<string, unknown>;
  confidence: number; // 0-1
}

interface Insight {
  id: string;
  observations: string[];
  pattern: string;
  recommendation: string;
  confidence: number;
}
```

#### Usage

```typescript
import { ImprovementEngine } from '@vibemate/core/improve';

const engine = new ImprovementEngine();

// Record observation
const observation = engine.record({
  type: 'success',
  description: 'User authentication implemented successfully',
  context: { framework: 'express', method: 'oauth' },
  confidence: 0.9
});

// Get insights
const insights = engine.getInsights({ minConfidence: 0.7 });

// Get recommendations
const recommendations = engine.getRecommendations();
```

### 6. State Management

The State Management module provides SQLite local-first storage.

#### Types

```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

interface Session {
  id: string;
  projectId: string;
  phase: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  endedAt?: string;
}

interface Decision {
  id: string;
  sessionId: string;
  type: string;
  data: Record<string, unknown>;
  previousHash: string;
  hash: string;
  createdAt: string;
}
```

#### Usage

```typescript
import { StateManager } from '@vibemate/core/state';

const state = new StateManager('./data.db');

// Create project
const project = state.createProject({
  name: 'my-app',
  description: 'My SaaS application'
});

// Create session
const session = state.createSession({
  projectId: project.id,
  phase: 'discovery'
});

// Record decision
const decision = state.recordDecision({
  sessionId: session.id,
  type: 'technology',
  data: { framework: 'next.js' }
});

// Get project history
const history = state.getProjectHistory(project.id);
```

## Error Handling

All modules throw typed errors for better error handling:

```typescript
import { VibemateError, DiscoveryError, ScaffoldError } from '@vibemate/core/shared';

try {
  // Use modules
} catch (error) {
  if (error instanceof DiscoveryError) {
    console.error('Discovery failed:', error.code, error.message);
  } else if (error instanceof ScaffoldError) {
    console.error('Scaffold failed:', error.code, error.message);
  } else if (error instanceof VibemateError) {
    console.error('General error:', error.code, error.message);
  }
}
```

## Validation

All module boundaries use Zod schemas for validation:

```typescript
import { projectSchema, sessionSchema } from '@vibemate/core/shared';

// Validate input
const result = projectSchema.safeParse(input);
if (!result.success) {
  console.error('Validation failed:', result.error.errors);
}

// Validate output
const output = sessionSchema.parse(session);
```

## Configuration

Modules can be configured via the `VibemateConfig` interface:

```typescript
import { VibemateConfig } from '@vibemate/core/shared';

const config: VibemateConfig = {
  version: '1.0.0',
  agents: ['claude-code', 'opencode'],
  okfBundlePath: './okf',
  mcpConfigPath: './mcp.json',
  telemetryEnabled: true,
  evolutionCadence: 'daily',
  cloudProviders: [],
  budget: 100
};
```
