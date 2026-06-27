// Vibemate SDD — Intent Confirmation Module

import { IntentExtraction, extractIntent } from './intent-extractor';

export interface ConfirmationResult {
  original: IntentExtraction;
  correctedIntent: IntentExtraction['inferredIntent'];
  confirmed: boolean;
  confidence: number;
  feedback: string;
}

export function confirmIntent(
  extraction: IntentExtraction,
  confirmed: boolean,
  feedback: string
): ConfirmationResult {
  if (!confirmed) {
    return {
      original: extraction,
      correctedIntent: extraction.inferredIntent,
      confirmed: false,
      confidence: extraction.confidence,
      feedback,
    };
  }

  // Apply feedback corrections
  const correctedIntent = applyFeedback(extraction.inferredIntent, feedback);
  
  // Recalculate confidence based on confirmation + feedback
  const confidence = calculateConfirmationConfidence(extraction, feedback);

  return {
    original: extraction,
    correctedIntent,
    confirmed: true,
    confidence,
    feedback,
  };
}

function applyFeedback(
  intent: IntentExtraction['inferredIntent'],
  feedback: string
): IntentExtraction['inferredIntent'] {
  if (!feedback || feedback.trim().length === 0) {
    return intent;
  }

  const lowerFeedback = feedback.toLowerCase();
  const updated = { ...intent };

  // Check if feedback modifies problem
  if (lowerFeedback.includes('actually') || lowerFeedback.includes('instead') || lowerFeedback.includes('rather')) {
    const buildMatch = feedback.match(/(?:build|create|make)\s+(?:a\s+)?(.+?)(?:\s+for|\s+that|$)/i);
    if (buildMatch) {
      updated.problem = buildMatch[1].trim();
    }
  }

  // Check if feedback modifies audience
  const forMatch = feedback.match(/for\s+(?:a\s+)?(.+?)(?:\s+that|\s+who|\s*,|$)/i);
  if (forMatch) {
    updated.audience = forMatch[1].trim();
  }

  // Check if feedback modifies success metric
  if (lowerFeedback.includes('deploy') || lowerFeedback.includes('launch')) {
    updated.successMetric = feedback.trim();
  }

  // Check if feedback adds constraints
  if (lowerFeedback.includes('no') || lowerFeedback.includes('must') || lowerFeedback.includes('should')) {
    const constraintMatch = feedback.match(/(?:no|must|should)\s+(.+?)(?:\s+and|\s+that|$)/i);
    if (constraintMatch) {
      updated.constraints = [...updated.constraints, constraintMatch[0].trim()];
    }
  }

  return updated;
}

function calculateConfirmationConfidence(
  extraction: IntentExtraction,
  feedback: string
): number {
  let confidence = extraction.confidence;

  // Boost for explicit confirmation
  confidence += 10;

  // Boost for detailed feedback
  if (feedback && feedback.length > 10) {
    confidence += 5;
  }

  // Boost for addressing gaps
  if (feedback && extraction.gaps.length > 0) {
    const lowerFeedback = feedback.toLowerCase();
    for (const _gap of extraction.gaps) {
      if (lowerFeedback.includes('success') || lowerFeedback.includes('metric')) {
        confidence += 5;
      }
      if (lowerFeedback.includes('constraint') || lowerFeedback.includes('requirement')) {
        confidence += 5;
      }
    }
  }

  return Math.min(100, confidence);
}

export function formatConfirmation(extraction: IntentExtraction): string {
  const lines: string[] = [];
  
  lines.push('=== Intent Confirmation ===');
  lines.push('');
  lines.push(`Problem: ${extraction.inferredIntent.problem}`);
  lines.push(`Audience: ${extraction.inferredIntent.audience}`);
  lines.push(`Success Metric: ${extraction.inferredIntent.successMetric}`);
  
  if (extraction.inferredIntent.constraints.length > 0) {
    lines.push(`Constraints: ${extraction.inferredIntent.constraints.join(', ')}`);
  }
  
  lines.push('');
  lines.push(`Confidence: ${extraction.confidence}%`);
  
  if (extraction.gaps.length > 0) {
    lines.push('');
    lines.push('Gaps identified:');
    for (const gap of extraction.gaps) {
      lines.push(`  - ${gap}`);
    }
  }
  
  return lines.join('\n');
}

export function updateFromFeedback(
  extraction: IntentExtraction,
  feedback: string
): IntentExtraction {
  // Re-extract with original input + feedback
  const combinedInput = `${extraction.rawInput}. ${feedback}`;
  const updated = extractIntent(combinedInput);
  
  return updated;
}
