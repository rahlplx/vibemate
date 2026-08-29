export interface ScoringCriteria {
  id: string;
  weight: number;
}

export interface ScoringInput {
  id: string;
  scores: Record<string, number>;
}

export interface RankedOption extends ScoringInput {
  totalScore: number;
}

export function calculateScore(
  scores: Record<string, number>,
  criteria: ScoringCriteria[]
): number {
  if (criteria.length === 0) return 0;

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;

  return criteria.reduce((sum, c) => {
    const score = scores[c.id] ?? 0;
    return sum + score * c.weight;
  }, 0) / totalWeight;
}

export function rankOptions(
  options: ScoringInput[],
  criteria: ScoringCriteria[]
): RankedOption[] {
  return options
    .map((opt) => ({
      ...opt,
      totalScore: calculateScore(opt.scores, criteria),
    }))
    .sort((a, b) => b.totalScore - a.totalScore);
}
