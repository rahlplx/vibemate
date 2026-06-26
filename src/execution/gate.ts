export type ExecutionMode = 'inline' | 'session' | 'subagent';

export interface ComplexityInput {
  description: string;
  filesChanged: number;
  linesChanged: number;
  hasTests: boolean;
  hasUI: boolean;
}

export function calculateComplexity(input: ComplexityInput): number {
  let score = 0;

  score += Math.min(5, input.filesChanged * 0.5);
  score += Math.min(5, input.linesChanged / 100);
  score += input.hasTests ? 2 : 0;
  score += input.hasUI ? 2 : 0;

  if (input.description.includes('refactor')) score += 2;
  if (input.description.includes('auth')) score += 1;
  if (input.description.includes('migrate')) score += 3;

  return Math.round(Math.min(20, Math.max(0, score)));
}

export function determineExecutionMode(complexityScore: number): ExecutionMode {
  if (complexityScore <= 5) return 'inline';
  if (complexityScore <= 15) return 'session';
  return 'subagent';
}
