# Example: Discovery Engine

This example shows how to use the Discovery Engine for adaptive brainstorming.

## Usage

```typescript
import { DiscoveryEngine } from '@vibemate/core/discovery';

async function main() {
  // Create discovery engine
  const engine = new DiscoveryEngine();

  // Start a discovery session for a SaaS project
  console.log('Starting discovery session...');
  const session = await engine.start('saas');

  // Simulate answering questions
  const questions = [
    { id: 'project_name', answer: 'My SaaS App' },
    { id: 'project_type', answer: 'B2B SaaS' },
    { id: 'target_users', answer: 'Small businesses' },
    { id: 'core_features', answer: 'User management, billing, analytics' },
    { id: 'tech_stack', answer: 'Next.js, PostgreSQL, Stripe' }
  ];

  let currentSession = session;

  for (const qa of questions) {
    const question = engine.getNextQuestion(currentSession);
    if (question && question.id === qa.id) {
      currentSession = engine.submitAnswer(currentSession, question.id, qa.answer);
      console.log(`Answered: ${question.message} → ${qa.answer}`);
    }
  }

  // Check ambiguity score
  const score = engine.getAmbiguityScore(currentSession);
  console.log(`Ambiguity score: ${score.score} (${score.level})`);

  // Get project brief
  const brief = engine.getProjectBrief(currentSession);
  console.log('Project Brief:', JSON.stringify(brief, null, 2));
}

main().catch(console.error);
```

## Output

```
Starting discovery session...
Answered: What is the name of your project? → My SaaS App
Answered: What type of project is this? → B2B SaaS
Answered: Who are your target users? → Small businesses
Answered: What are the core features? → User management, billing, analytics
Answered: What tech stack do you want to use? → Next.js, PostgreSQL, Stripe
Ambiguity score: 0.1 (clear)
Project Brief: {
  "name": "My SaaS App",
  "type": "B2B SaaS",
  "users": "Small businesses",
  "features": ["User management", "Billing", "Analytics"],
  "stack": ["Next.js", "PostgreSQL", "Stripe"]
}
```
