import { extractIntent } from "../src/sdd/intent-extractor";

const inputs = [
  "I want to build a landing page generator for non-technical founders that deploys in 5 minutes with no backend",
  "Build a tool for small business owners",
  "I need a fast API gateway for enterprise teams that should reduce bounce rate by 30%",
  "No backend, static HTML only, must work on mobile",
  "Build me something cool",
  "Build a marketing tool targeting enterprise teams that deploys to Vercel in 5 minutes with no backend"
];

const N = 100000;
const start = performance.now();
for (let i = 0; i < N; i++) {
  extractIntent(inputs[i % inputs.length]);
}
const duration = performance.now() - start;
console.log(`Optimized extractIntent throughput: ${duration.toFixed(2)} ms (${(N / (duration / 1000)).toFixed(0)} ops/sec)`);
