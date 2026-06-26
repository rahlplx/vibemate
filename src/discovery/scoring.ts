export interface AnswerConfidence {
  questionId: string;
  value: string;
  confidence: number;
  isText?: boolean;
}

export interface AmbiguityResult {
  score: number;
  level: 'clear' | 'moderate' | 'high';
  factors: string[];
}

export function calculateAmbiguityScore(answers: AnswerConfidence[]): AmbiguityResult {
  if (answers.length === 0) {
    return { score: 0, level: 'clear', factors: [] };
  }

  const factors: string[] = [];
  let totalPenalty = 0;

  for (const answer of answers) {
    const confidencePenalty = 1 - answer.confidence;
    totalPenalty += confidencePenalty;

    if (answer.confidence < 0.5) {
      factors.push(`Low confidence on ${answer.questionId}`);
    }

    if (answer.isText) {
      totalPenalty += 0.1;
      factors.push(`Free text answer on ${answer.questionId}`);
    }
  }

  const score = Math.min(1, totalPenalty / answers.length);
  const level = getAmbiguityLevel(score);

  return { score, level, factors };
}

export function getAmbiguityLevel(score: number): 'clear' | 'moderate' | 'high' {
  if (score < 0.3) return 'clear';
  if (score < 0.7) return 'moderate';
  return 'high';
}
