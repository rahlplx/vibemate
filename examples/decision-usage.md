# Example: Decision Engine

This example shows how to use the Decision Engine for technology comparison.

## Usage

```typescript
import { DecisionEngine } from '@vibemate/core/decision';

async function main() {
  // Create decision engine
  const engine = new DecisionEngine();

  // Define criteria for comparing databases
  const criteria = [
    { name: 'performance', weight: 0.3, description: 'Requests per second' },
    { name: 'cost', weight: 0.3, description: 'Monthly cost' },
    { name: 'ease', weight: 0.2, description: 'Learning curve' },
    { name: 'scalability', weight: 0.2, description: 'Growth potential' }
  ];

  // Define options
  const options = [
    { 
      name: 'SQLite', 
      scores: { performance: 8, cost: 10, ease: 9, scalability: 5 },
      benchmarks: { reads: 100000, writes: 50000, latency: 0.1 }
    },
    { 
      name: 'PostgreSQL', 
      scores: { performance: 9, cost: 7, ease: 6, scalability: 9 },
      benchmarks: { reads: 50000, writes: 30000, latency: 0.5 }
    },
    { 
      name: 'MongoDB', 
      scores: { performance: 7, cost: 8, ease: 7, scalability: 8 },
      benchmarks: { reads: 40000, writes: 25000, latency: 0.8 }
    }
  ];

  // Create comparison matrix
  const matrix = engine.createMatrix({ criteria, options });

  // Get rankings
  const rankings = engine.rankOptions(matrix);
  console.log('Rankings:', rankings);

  // Get recommendation
  const recommendation = engine.getRecommendation(matrix);
  console.log('Recommendation:', recommendation);

  // Get detailed analysis
  const analysis = engine.analyzeTradeoffs(matrix);
  console.log('Tradeoffs:', analysis);
}

main().catch(console.error);
```

## Output

```
Rankings: [
  { option: 'SQLite', score: 8.2 },
  { option: 'PostgreSQL', score: 7.8 },
  { option: 'MongoDB', score: 7.5 }
]
Recommendation: SQLite is recommended for your use case. It offers the best balance of performance, cost, and ease of use for your requirements.
Tradeoffs: {
  'SQLite vs PostgreSQL': 'SQLite is faster and cheaper, but PostgreSQL offers better scalability',
  'SQLite vs MongoDB': 'SQLite is simpler and more performant, but MongoDB provides more flexibility'
}
```
