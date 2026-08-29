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
  const criteriaLen = matrix.criteria.length;

  // Pre-calculate totalWeight once outside the options loop, avoiding O(N * M) redundant weight sums
  let totalWeight = 0;
  for (let j = 0; j < criteriaLen; j++) {
    totalWeight += matrix.criteria[j].weight;
  }

  const optionsLen = matrix.options.length;
  // Pre-allocate array to avoid intermediate callback allocation from .map()
  const newOptions = new Array<MatrixOption>(optionsLen);

  for (let i = 0; i < optionsLen; i++) {
    const opt = matrix.options[i];
    if (opt.id !== optionId) {
      newOptions[i] = opt;
      continue;
    }

    let weightedScore = 0;
    if (totalWeight > 0) {
      let weightedSum = 0;
      for (let j = 0; j < criteriaLen; j++) {
        const c = matrix.criteria[j];
        const score = scores[c.id] ?? 0;
        weightedSum += score * c.weight;
      }
      weightedScore = weightedSum / totalWeight;
    }

    newOptions[i] = { ...opt, scores, weightedScore };
  }

  return {
    ...matrix,
    options: newOptions,
  };
}

export function getWinner(matrix: ComparisonMatrix): MatrixOption | undefined {
  if (matrix.options.length === 0) return undefined;
  return [...matrix.options].sort(
    (a, b) => b.weightedScore - a.weightedScore
  )[0];
}
