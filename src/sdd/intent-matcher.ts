// Vibemate SDD — Intent Matching Module

import { IntentExtraction } from './intent-extractor';

export interface IntentMatchResult {
  extraction: IntentExtraction;
  output: string;
  matchScore: number;
  matchedElements: string[];
  unmatchedElements: string[];
  reasoning: string[];
}

export function matchIntent(
  extraction: IntentExtraction,
  output: string
): IntentMatchResult {
  const lowerOutput = output.toLowerCase();
  const intent = extraction.inferredIntent;
  
  const matchedElements: string[] = [];
  const unmatchedElements: string[] = [];
  const reasoning: string[] = [];
  
  // Match problem
  const problemKeywords = intent.problem.toLowerCase().split(/\s+/);
  const problemMatches = problemKeywords.filter(kw => lowerOutput.includes(kw));
  if (problemMatches.length > problemKeywords.length * 0.5) {
    matchedElements.push('problem');
    reasoning.push(`Problem matched: ${problemMatches.join(', ')}`);
  } else {
    unmatchedElements.push('problem');
    reasoning.push(`Problem not fully matched: only ${problemMatches.length}/${problemKeywords.length} keywords found`);
  }
  
  // Match audience
  const audienceKeywords = intent.audience.toLowerCase().split(/\s+/);
  const audienceMatches = audienceKeywords.filter(kw => lowerOutput.includes(kw));
  if (audienceMatches.length > audienceKeywords.length * 0.5) {
    matchedElements.push('audience');
    reasoning.push(`Audience matched: ${audienceMatches.join(', ')}`);
  } else {
    unmatchedElements.push('audience');
    reasoning.push(`Audience not matched`);
  }
  
  // Match success metric
  const metricKeywords = intent.successMetric.toLowerCase().split(/\s+/);
  const metricMatches = metricKeywords.filter(kw => lowerOutput.includes(kw));
  if (metricMatches.length > metricKeywords.length * 0.3) {
    matchedElements.push('successMetric');
    reasoning.push(`Success metric matched: ${metricMatches.join(', ')}`);
  } else {
    unmatchedElements.push('successMetric');
    reasoning.push(`Success metric not matched`);
  }
  
  // Match constraints
  for (const constraint of intent.constraints) {
    const constraintKeywords = constraint.toLowerCase().split(/\s+/);
    const constraintMatches = constraintKeywords.filter(kw => lowerOutput.includes(kw));
    if (constraintMatches.length > constraintKeywords.length * 0.5) {
      matchedElements.push(`constraint:${constraint}`);
      reasoning.push(`Constraint matched: ${constraint}`);
    } else {
      unmatchedElements.push(`constraint:${constraint}`);
      reasoning.push(`Constraint not matched: ${constraint}`);
    }
  }
  
  // Calculate match score
  const totalElements = 3 + intent.constraints.length; // problem + audience + metric + constraints
  const matchScore = Math.round((matchedElements.length / totalElements) * 100);
  
  return {
    extraction,
    output,
    matchScore,
    matchedElements,
    unmatchedElements,
    reasoning,
  };
}

export function calculateMatchScore(
  extraction: IntentExtraction,
  output: string
): number {
  const result = matchIntent(extraction, output);
  return result.matchScore;
}

export function identifyMatchGaps(
  extraction: IntentExtraction,
  output: string
): string[] {
  const result = matchIntent(extraction, output);
  return result.unmatchedElements;
}
