# Example: Complete Workflow

This example shows how to use all modules together for a complete product development workflow.

## Usage

```typescript
import { DiscoveryEngine } from '@vibemate/core/discovery';
import { DecisionEngine } from '@vibemate/core/decision';
import { ScaffoldGenerator } from '@vibemate/core/scaffold';
import { ExecutionGate } from '@vibemate/core/execution';
import { ImprovementEngine } from '@vibemate/core/improve';
import { StateManager } from '@vibemate/core/state';

async function main() {
  // Initialize state manager
  const state = new StateManager('./vibemate.db');

  // Create project
  const project = state.createProject({
    name: 'my-saas-app',
    description: 'My SaaS application'
  });

  // Phase 1: Discovery
  console.log('=== Phase 1: Discovery ===');
  const discovery = new DiscoveryEngine();
  const session = await discovery.start('saas');

  // Answer questions
  const answers = [
    { id: 'project_name', answer: 'My SaaS App' },
    { id: 'project_type', answer: 'B2B SaaS' },
    { id: 'target_users', answer: 'Small businesses' },
    { id: 'core_features', answer: 'User management, billing, analytics' },
    { id: 'tech_stack', answer: 'Next.js, PostgreSQL, Stripe' }
  ];

  let currentSession = session;
  for (const qa of answers) {
    const question = discovery.getNextQuestion(currentSession);
    if (question && question.id === qa.id) {
      currentSession = discovery.submitAnswer(currentSession, question.id, qa.answer);
    }
  }

  const brief = discovery.getProjectBrief(currentSession);
  console.log('Project Brief:', brief);

  // Record decision
  state.recordDecision({
    sessionId: project.id,
    type: 'discovery',
    data: brief
  });

  // Phase 2: Decision Making
  console.log('\n=== Phase 2: Decision Making ===');
  const decision = new DecisionEngine();

  // Compare databases
  const dbComparison = decision.createMatrix({
    criteria: [
      { name: 'performance', weight: 0.3, description: 'Speed' },
      { name: 'cost', weight: 0.3, description: 'Price' },
      { name: 'ease', weight: 0.4, description: 'Learning curve' }
    ],
    options: [
      { name: 'SQLite', scores: { performance: 8, cost: 10, ease: 9 } },
      { name: 'PostgreSQL', scores: { performance: 9, cost: 7, ease: 6 } }
    ]
  });

  const dbRecommendation = decision.getRecommendation(dbComparison);
  console.log('Database recommendation:', dbRecommendation);

  // Record decision
  state.recordDecision({
    sessionId: project.id,
    type: 'database',
    data: { recommendation: dbRecommendation }
  });

  // Phase 3: Scaffolding
  console.log('\n=== Phase 3: Scaffolding ===');
  const scaffold = new ScaffoldGenerator();

  const scaffoldResult = await scaffold.generate({
    template: 'saas',
    variables: {
      projectName: brief.name,
      description: brief.description,
      author: 'John Doe',
      database: 'postgresql',
      auth: 'oauth',
      billing: 'stripe'
    },
    outputDir: './my-saas-app'
  });

  console.log('Generated files:', scaffoldResult.files);

  // Phase 4: Execution Planning
  console.log('\n=== Phase 4: Execution Planning ===');
  const execution = new ExecutionGate();

  const tasks = [
    { id: '1', description: 'Setup project', complexity: 20, dependencies: [], estimatedTime: 10 },
    { id: '2', description: 'Implement auth', complexity: 60, dependencies: ['1'], estimatedTime: 60 },
    { id: '3', description: 'Add database', complexity: 40, dependencies: ['1'], estimatedTime: 30 },
    { id: '4', description: 'Create API', complexity: 50, dependencies: ['2', '3'], estimatedTime: 45 },
    { id: '5', description: 'Write tests', complexity: 30, dependencies: ['4'], estimatedTime: 40 }
  ];

  const plan = execution.createPlan(tasks);
  console.log('Execution plan:', plan);

  // Phase 5: Self-Improvement
  console.log('\n=== Phase 5: Self-Improvement ===');
  const improve = new ImprovementEngine();

  // Record success
  improve.record({
    type: 'success',
    description: 'Project setup completed successfully',
    context: { project: project.name, phase: 'setup' },
    confidence: 0.9
  });

  // Get insights
  const insights = improve.getInsights({ minConfidence: 0.7 });
  console.log('Insights:', insights);

  // Final Summary
  console.log('\n=== Final Summary ===');
  console.log('Project:', project.name);
  console.log('Status:', project.status);
  console.log('Files generated:', scaffoldResult.files.length);
  console.log('Tasks planned:', tasks.length);
  console.log('Estimated time:', plan.estimatedTotalTime, 'minutes');
}

main().catch(console.error);
```

## Output

```
=== Phase 1: Discovery ===
Project Brief: {
  name: 'My SaaS App',
  type: 'B2B SaaS',
  users: 'Small businesses',
  features: ['User management', 'Billing', 'Analytics'],
  stack: ['Next.js', 'PostgreSQL', 'Stripe']
}

=== Phase 2: Decision Making ===
Database recommendation: PostgreSQL is recommended for your use case. It offers better performance and scalability for your B2B SaaS application.

=== Phase 3: Scaffolding ===
Generated files: [
  'package.json',
  'tsconfig.json',
  'src/index.ts',
  'src/routes/auth.ts',
  'src/routes/billing.ts',
  'src/middleware/auth.ts',
  'src/database/schema.sql',
  '.env.example',
  'README.md'
]

=== Phase 4: Execution Planning ===
Execution plan: {
  tasks: [...],
  routes: [
    { taskId: '1', route: 'inline' },
    { taskId: '2', route: 'session' },
    { taskId: '3', route: 'inline' },
    { taskId: '4', route: 'session' },
    { taskId: '5', route: 'inline' }
  ],
  estimatedTotalTime: 185
}

=== Phase 5: Self-Improvement ===
Insights: [
  {
    id: 'insight_1',
    pattern: 'Project setup typically takes 10-15 minutes',
    recommendation: 'Consider using templates to speed up setup',
    confidence: 0.85
  }
]

=== Final Summary ===
Project: My SaaS App
Status: active
Files generated: 9
Tasks planned: 5
Estimated time: 185 minutes
```
