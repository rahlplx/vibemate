export interface MatrixOption {
  id: string;
  name: string;
  description: string;
  scores: Record<string, number>;
  weightedScore: number;
}

export interface MatrixCriteria {
  id: string;
  name: string;
  weight: number;
}

export interface ComparisonMatrix {
  id: string;
  options: MatrixOption[];
  criteria: MatrixCriteria[];
}

export function createMatrix(id: string): ComparisonMatrix {
  return { id, options: [], criteria: [] };
}

export function addOption(
  matrix: ComparisonMatrix,
  option: { id: string; name: string; description: string }
): ComparisonMatrix {
  return {
    ...matrix,
    options: [
      ...matrix.options,
      { ...option, scores: {}, weightedScore: 0 },
    ],
  };
}

export function addCriteria(
  matrix: ComparisonMatrix,
  criteria: { id: string; name: string; weight: number }
): ComparisonMatrix {
  return {
    ...matrix,
    criteria: [...matrix.criteria, criteria],
  };
}

export function scoreOption(
  matrix: ComparisonMatrix,
  optionId: string,
  scores: Record<string, number>
): ComparisonMatrix {
  return {
    ...matrix,
    options: matrix.options.map((opt) => {
      if (opt.id !== optionId) return opt;

      const totalWeight = matrix.criteria.reduce((sum, c) => sum + c.weight, 0);
      const weightedScore =
        totalWeight > 0
          ? matrix.criteria.reduce((sum, c) => {
              const score = scores[c.id] ?? 0;
              return sum + score * c.weight;
            }, 0) / totalWeight
          : 0;

      return { ...opt, scores, weightedScore };
    }),
  };
}

export function getWinner(matrix: ComparisonMatrix): MatrixOption | undefined {
  if (matrix.options.length === 0) return undefined;
  return [...matrix.options].sort(
    (a, b) => b.weightedScore - a.weightedScore
  )[0];
}
