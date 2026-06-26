# Example: Execution Gate

This example shows how to use the Execution Gate for complexity-based routing.

## Usage

```typescript
import { ExecutionGate } from '@vibemate/core/execution';

async function main() {
  // Create execution gate
  const gate = new ExecutionGate();

  // Define tasks
  const tasks = [
    { 
      id: '1', 
      description: 'Setup project structure', 
      complexity: 20,
      dependencies: [],
      estimatedTime: 10
    },
    { 
      id: '2', 
      description: 'Implement user authentication', 
      complexity: 60,
      dependencies: ['1'],
      estimatedTime: 60
    },
    { 
      id: '3', 
      description: 'Add database schema', 
      complexity: 40,
      dependencies: ['1'],
      estimatedTime: 30
    },
    { 
      id: '4', 
      description: 'Create API endpoints', 
      complexity: 50,
      dependencies: ['2', '3'],
      estimatedTime: 45
    },
    { 
      id: '5', 
      description: 'Write unit tests', 
      complexity: 30,
      dependencies: ['4'],
      estimatedTime: 40
    }
  ];

  // Create execution plan
  const plan = gate.createPlan(tasks);
  console.log('Execution Plan:', plan);

  // Analyze complexity
  for (const task of tasks) {
    const complexity = gate.analyzeComplexity(task);
    const route = gate.getRoute(plan, task.id);
    console.log(`Task ${task.id}: ${task.description} → ${route} (complexity: ${complexity})`);
  }

  // Get optimal execution order
  const order = gate.getExecutionOrder(plan);
  console.log('Optimal execution order:', order);

  // Estimate total time
  const estimatedTime = gate.estimateTotalTime(plan);
  console.log(`Estimated total time: ${estimatedTime} minutes`);
}

main().catch(console.error);
```

## Output

```
Execution Plan: {
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
Task 1: Setup project structure → inline (complexity: 20)
Task 2: Implement user authentication → session (complexity: 60)
Task 3: Add database schema → inline (complexity: 40)
Task 4: Create API endpoints → session (complexity: 50)
Task 5: Write unit tests → inline (complexity: 30)
Optimal execution order: ['1', '3', '2', '4', '5']
Estimated total time: 185 minutes
```
