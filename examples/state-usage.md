# Example: State Management

This example shows how to use the State Management module for SQLite local-first storage.

## Usage

```typescript
import { StateManager } from '@vibemate/core/state';

async function main() {
  // Create state manager with SQLite database
  const state = new StateManager('./vibemate.db');

  // Create a project
  console.log('Creating project...');
  const project = state.createProject({
    name: 'my-saas-app',
    description: 'My SaaS application'
  });
  console.log('Project created:', project);

  // Create a session
  console.log('Creating session...');
  const session = state.createSession({
    projectId: project.id,
    phase: 'discovery'
  });
  console.log('Session created:', session);

  // Record decisions
  console.log('Recording decisions...');
  const decision1 = state.recordDecision({
    sessionId: session.id,
    type: 'technology',
    data: { framework: 'next.js', database: 'postgresql' }
  });
  console.log('Decision recorded:', decision1);

  const decision2 = state.recordDecision({
    sessionId: session.id,
    type: 'architecture',
    data: { pattern: 'hexagonal', layers: ['api', 'service', 'repository'] }
  });
  console.log('Decision recorded:', decision2);

  // Record observations
  console.log('Recording observations...');
  const observation1 = state.recordObservation({
    sessionId: session.id,
    type: 'success',
    description: 'Discovery phase completed successfully',
    data: { questionsAnswered: 10, ambiguityScore: 0.1 }
  });
  console.log('Observation recorded:', observation1);

  // Get project history
  console.log('Getting project history...');
  const history = state.getProjectHistory(project.id);
  console.log('Project history:', history);

  // Get session details
  console.log('Getting session details...');
  const sessionDetails = state.getSession(session.id);
  console.log('Session details:', sessionDetails);

  // Update session status
  console.log('Updating session status...');
  state.updateSession(session.id, { status: 'completed' });
  console.log('Session updated');

  // Get all projects
  console.log('Getting all projects...');
  const projects = state.listProjects();
  console.log('Projects:', projects);
}

main().catch(console.error);
```

## Output

```
Creating project...
Project created: {
  id: 'proj_123',
  name: 'my-saas-app',
  description: 'My SaaS application',
  status: 'active',
  createdAt: '2026-06-27T04:20:00.000Z',
  updatedAt: '2026-06-27T04:20:00.000Z'
}
Creating session...
Session created: {
  id: 'sess_456',
  projectId: 'proj_123',
  phase: 'discovery',
  status: 'running',
  startedAt: '2026-06-27T04:20:00.000Z'
}
Recording decisions...
Decision recorded: {
  id: 'dec_789',
  sessionId: 'sess_456',
  type: 'technology',
  data: { framework: 'next.js', database: 'postgresql' },
  previousHash: '0000000000000000',
  hash: 'abc123...',
  createdAt: '2026-06-27T04:20:00.000Z'
}
Decision recorded: {
  id: 'dec_012',
  sessionId: 'sess_456',
  type: 'architecture',
  data: { pattern: 'hexagonal', layers: ['api', 'service', 'repository'] },
  previousHash: 'abc123...',
  hash: 'def456...',
  createdAt: '2026-06-27T04:20:00.000Z'
}
Recording observations...
Observation recorded: {
  id: 'obs_345',
  sessionId: 'sess_456',
  type: 'success',
  description: 'Discovery phase completed successfully',
  data: { questionsAnswered: 10, ambiguityScore: 0.1 },
  timestamp: '2026-06-27T04:20:00.000Z'
}
Getting project history...
Project history: {
  project: { id: 'proj_123', name: 'my-saas-app', ... },
  sessions: [{ id: 'sess_456', phase: 'discovery', ... }],
  decisions: [{ id: 'dec_789', type: 'technology', ... }, ...],
  observations: [{ id: 'obs_345', type: 'success', ... }]
}
Getting session details...
Session details: {
  id: 'sess_456',
  projectId: 'proj_123',
  phase: 'discovery',
  status: 'completed',
  startedAt: '2026-06-27T04:20:00.000Z',
  endedAt: '2026-06-27T04:25:00.000Z'
}
Updating session status...
Session updated
Getting all projects...
Projects: [{ id: 'proj_123', name: 'my-saas-app', ... }]
```
