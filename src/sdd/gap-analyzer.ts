// Vibemate SDD — Gap Analysis Module

import { IntentExtraction } from './intent-extractor';

export interface Gap {
  type: 'problem' | 'audience' | 'successMetric' | 'constraints' | 'timeline';
  message: string;
  severity: number;
  critical?: boolean;
}

export interface GapAnalysis {
  extraction: IntentExtraction;
  categorized: Record<string, Gap[]>;
  severity: number;
  recommendations: string[];
}

const QUESTION_BANK: Record<string, string[]> = {
  problem: [
    'What problem are you trying to solve?',
    'What would you like me to build?',
    'What is the main feature you need?',
  ],
  audience: [
    'Who will be using this?',
    'What is your target audience?',
    'Who are the primary users?',
  ],
  successMetric: [
    'How will you know this is successful?',
    'What does "done" look like?',
    'What metrics will you track?',
  ],
  constraints: [
    'Are there any constraints I should know about?',
    'What technologies must be used or avoided?',
    'Are there budget or time limitations?',
  ],
  timeline: [
    'What is your timeline?',
    'When does this need to be complete?',
    'Are there any deadlines?',
  ],
};

const DEFAULT_QUESTIONS = [
  'Can you tell me more about this aspect?',
  'What details can you provide here?',
];

export function analyzeGaps(extraction: IntentExtraction): GapAnalysis {
  const rawGaps = extraction.gaps;
  const gapCount = rawGaps.length;

  const categorized: Record<string, Gap[]> = {
    problem: [],
    audience: [],
    successMetric: [],
    constraints: [],
    timeline: [],
  };

  let hasCritical = false;
  let hasAudience = false;
  let hasSuccessMetric = false;
  let hasConstraints = false;

  // Single-pass gap parsing, categorization, and flag tracking
  for (let i = 0; i < gapCount; i++) {
    const gap = parseGap(rawGaps[i]);
    categorized[gap.type].push(gap);

    const type = gap.type;
    if (type === 'audience') {
      hasAudience = true;
      hasCritical = true;
    } else if (type === 'problem') {
      hasCritical = true;
    } else if (type === 'successMetric') {
      hasSuccessMetric = true;
    } else if (type === 'constraints') {
      hasConstraints = true;
    }
  }

  // Calculate severity (0-10) directly without extra array iterations
  let severity = 0;
  if (gapCount > 0) {
    let baseSeverity = Math.min(5, gapCount * 1.5) + (100 - extraction.confidence) / 20;
    if (hasCritical) baseSeverity += 2;
    severity = Math.min(10, Math.round(baseSeverity));
  }

  // Generate recommendations directly using tracked flags
  const recommendations: string[] = [];
  if (extraction.confidence < 50) {
    recommendations.push('Consider providing more details to improve intent clarity');
  }
  if (hasAudience) {
    recommendations.push('Define your target audience to tailor the solution');
  }
  if (hasSuccessMetric) {
    recommendations.push('Set clear success metrics to measure completion');
  }
  if (hasConstraints) {
    recommendations.push('Specify constraints to avoid scope creep');
  }
  if (gapCount > 3) {
    recommendations.push('Too many gaps detected — consider a more structured input format');
  }

  return {
    extraction,
    categorized,
    severity,
    recommendations,
  };
}

function parseGap(gapMessage: string): Gap {
  const lower = gapMessage.toLowerCase();

  if (lower.includes('audience') || lower.includes('who')) {
    return { type: 'audience', message: gapMessage, severity: 8 };
  }
  if (lower.includes('success') || lower.includes('metric') || lower.includes('succeeded')) {
    return { type: 'successMetric', message: gapMessage, severity: 7 };
  }
  if (lower.includes('constraint') || lower.includes('requirement')) {
    return { type: 'constraints', message: gapMessage, severity: 5 };
  }
  if (lower.includes('timeline') || lower.includes('time') || lower.includes('when')) {
    return { type: 'timeline', message: gapMessage, severity: 4 };
  }
  if (lower.includes('build') || lower.includes('create') || lower.includes('what')) {
    return { type: 'problem', message: gapMessage, severity: 9 };
  }

  return { type: 'problem', message: gapMessage, severity: 5 };
}

export function prioritizeGaps(gaps: Gap[]): Gap[] {
  const len = gaps.length;
  const result: Gap[] = new Array(len);

  // Single-pass copying and critical flag assignment
  for (let i = 0; i < len; i++) {
    const g = gaps[i];
    result[i] = {
      type: g.type,
      message: g.message,
      severity: g.severity,
      critical: g.severity >= 8,
    };
  }

  return result.sort((a, b) => b.severity - a.severity);
}

export function suggestQuestions(gapType: string): string[] {
  return QUESTION_BANK[gapType] || DEFAULT_QUESTIONS;
}
