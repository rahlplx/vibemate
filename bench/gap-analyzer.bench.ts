import { analyzeGaps, prioritizeGaps } from '../src/sdd/gap-analyzer';
import { IntentExtraction } from '../src/sdd/intent-extractor';

const mockExtraction: IntentExtraction = {
  rawInput: 'Build a landing page generator for high converting SaaS apps with 99.9% uptime requirement',
  inferredIntent: {
    problem: 'landing page generator',
    audience: 'SaaS companies',
    successMetric: '99.9% uptime',
    constraints: ['Fast loading'],
  },
  gaps: [
    'Missing target audience: Who is this specifically for?',
    'Missing success metric: How do you measure conversion?',
    'Missing requirement: What constraints or technology stack restrictions exist?',
    'Missing timeline: When does this need to be complete?',
    'Missing details: What build or create options exist?'
  ],
  confidence: 45,
};

const ITERATIONS = 500_000;

console.log(`Running Gap Analyzer Benchmark (${ITERATIONS} iterations)...`);

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  analyzeGaps(mockExtraction);
}
const elapsed = performance.now() - start;

console.log(`analyzeGaps time: ${elapsed.toFixed(2)} ms`);
console.log(`Throughput: ${((ITERATIONS / elapsed) * 1000).toFixed(0)} ops/sec`);

const sampleAnalysis = analyzeGaps(mockExtraction);
const start2 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  prioritizeGaps(sampleAnalysis.categorized.audience);
}
const elapsed2 = performance.now() - start2;
console.log(`prioritizeGaps time: ${elapsed2.toFixed(2)} ms`);
