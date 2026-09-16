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

/**
 * Helper to evaluate keyword matches against output without regex or intermediate split/filter array chains.
 * Uses indexed charCodeAt scanning to slice words directly and avoid RegExp exec match allocations.
 */
function evaluateKeywords(
  text: string,
  lowerOutput: string
): { total: number; matches: string[] } {
  if (!text) return { total: 0, matches: [] };

  const lowerText = text.toLowerCase();
  let total = 0;
  const matches: string[] = [];
  let start = 0;
  const len = lowerText.length;

  while (start < len) {
    // Skip whitespace (ASCII <= 32)
    while (start < len && lowerText.charCodeAt(start) <= 32) {
      start++;
    }
    if (start >= len) break;

    // Find word end
    let end = start + 1;
    while (end < len && lowerText.charCodeAt(end) > 32) {
      end++;
    }

    total++;
    const word = lowerText.substring(start, end);
    if (lowerOutput.includes(word)) {
      matches.push(word);
    }
    start = end;
  }

  return { total, matches };
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
  const problemEval = evaluateKeywords(intent.problem, lowerOutput);
  if (problemEval.total > 0 && problemEval.matches.length > problemEval.total * 0.5) {
    matchedElements.push('problem');
    reasoning.push(`Problem matched: ${problemEval.matches.join(', ')}`);
  } else {
    unmatchedElements.push('problem');
    reasoning.push(`Problem not fully matched: only ${problemEval.matches.length}/${problemEval.total} keywords found`);
  }
  
  // Match audience
  const audienceEval = evaluateKeywords(intent.audience, lowerOutput);
  if (audienceEval.total > 0 && audienceEval.matches.length > audienceEval.total * 0.5) {
    matchedElements.push('audience');
    reasoning.push(`Audience matched: ${audienceEval.matches.join(', ')}`);
  } else {
    unmatchedElements.push('audience');
    reasoning.push(`Audience not matched`);
  }
  
  // Match success metric
  const metricEval = evaluateKeywords(intent.successMetric, lowerOutput);
  if (metricEval.total > 0 && metricEval.matches.length > metricEval.total * 0.3) {
    matchedElements.push('successMetric');
    reasoning.push(`Success metric matched: ${metricEval.matches.join(', ')}`);
  } else {
    unmatchedElements.push('successMetric');
    reasoning.push(`Success metric not matched`);
  }
  
  // Match constraints
  for (const constraint of intent.constraints) {
    const constraintEval = evaluateKeywords(constraint, lowerOutput);
    if (constraintEval.total > 0 && constraintEval.matches.length > constraintEval.total * 0.5) {
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
