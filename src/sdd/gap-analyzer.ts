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

export function analyzeGaps(extraction: IntentExtraction): GapAnalysis {
  const gaps: Gap[] = extraction.gaps.map(g => parseGap(g));
  
  // Categorize gaps
  const categorized: Record<string, Gap[]> = {
    problem: [],
    audience: [],
    successMetric: [],
    constraints: [],
    timeline: [],
  };
  
  for (const gap of gaps) {
    categorized[gap.type].push(gap);
  }
  
  // Calculate severity (0-10)
  const severity = calculateSeverity(gaps, extraction.confidence);
  
  // Generate recommendations
  const recommendations = generateRecommendations(gaps, extraction);
  
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

function calculateSeverity(gaps: Gap[], confidence: number): number {
  if (gaps.length === 0) return 0;
  
  // Base severity from gap count
  let severity = Math.min(5, gaps.length * 1.5);
  
  // Adjust for confidence
  severity += (100 - confidence) / 20;
  
  // Check for critical gaps
  const hasCritical = gaps.some(g => g.type === 'problem' || g.type === 'audience');
  if (hasCritical) severity += 2;
  
  return Math.min(10, Math.round(severity));
}

function generateRecommendations(gaps: Gap[], extraction: IntentExtraction): string[] {
  const recommendations: string[] = [];
  
  if (extraction.confidence < 50) {
    recommendations.push('Consider providing more details to improve intent clarity');
  }
  
  if (gaps.some(g => g.type === 'audience')) {
    recommendations.push('Define your target audience to tailor the solution');
  }
  
  if (gaps.some(g => g.type === 'successMetric')) {
    recommendations.push('Set clear success metrics to measure completion');
  }
  
  if (gaps.some(g => g.type === 'constraints')) {
    recommendations.push('Specify constraints to avoid scope creep');
  }
  
  if (gaps.length > 3) {
    recommendations.push('Too many gaps detected — consider a more structured input format');
  }
  
  return recommendations;
}

export function prioritizeGaps(gaps: Gap[]): Gap[] {
  return [...gaps]
    .sort((a, b) => b.severity - a.severity)
    .map(g => ({
      ...g,
      critical: g.severity >= 8,
    }));
}

export function suggestQuestions(gapType: string): string[] {
  const questionBank: Record<string, string[]> = {
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
  
  return questionBank[gapType] || [
    'Can you tell me more about this aspect?',
    'What details can you provide here?',
  ];
}
