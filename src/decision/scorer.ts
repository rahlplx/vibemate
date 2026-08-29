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
  const len = criteria.length;
  if (len === 0) return 0;

  // Single-pass indexed loop calculates totalWeight and weightedSum simultaneously,
  // avoiding double array allocations and function call overhead from double .reduce()
  let totalWeight = 0;
  let weightedSum = 0;
  for (let i = 0; i < len; i++) {
    const c = criteria[i];
    const weight = c.weight;
    totalWeight += weight;
    const score = scores[c.id] ?? 0;
    weightedSum += score * weight;
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}

export function rankOptions(
  options: ScoringInput[],
  criteria: ScoringCriteria[]
): RankedOption[] {
  const len = options.length;
  // Pre-allocated array allocation avoids intermediate array creation from .map()
  const result = new Array<RankedOption>(len);
  for (let i = 0; i < len; i++) {
    const opt = options[i];
    result[i] = {
      ...opt,
      totalScore: calculateScore(opt.scores, criteria),
    };
  }
  return result.sort((a, b) => b.totalScore - a.totalScore);
}
