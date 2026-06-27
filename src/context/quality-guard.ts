// Quality Guard - Summary validation (inspired by OpenClaw)
interface ValidationResult {
  isValid: boolean;
  score: number;
  reasons: string[];
}

interface CompletenessResult {
  coverage: number;
  found: string[];
  missing: string[];
}

export class QualityGuard {
  validate(summary: string, original: string): ValidationResult {
    const reasons: string[] = [];
    let score = 0;

    // Check 1: Summary length relative to original
    const lengthRatio = summary.length / original.length;
    if (lengthRatio < 0.1) {
      reasons.push('Summary too short (< 10% of original)');
      score -= 0.3;
    } else if (lengthRatio > 0.9) {
      reasons.push('Summary too long (> 90% of original)');
      score -= 0.2;
    } else {
      score += 0.3;
    }

    // Check 2: Summary contains key terms from original
    const originalWords = new Set(original.toLowerCase().split(/\s+/));
    const summaryWords = new Set(summary.toLowerCase().split(/\s+/));
    
    let commonWords = 0;
    for (const word of summaryWords) {
      if (originalWords.has(word) && word.length > 3) {
        commonWords++;
      }
    }
    
    const termCoverage = commonWords / Math.max(summaryWords.size, 1);
    if (termCoverage > 0.2) {
      score += 0.4;
    } else if (termCoverage > 0.05) {
      score += 0.2;
    } else {
      reasons.push('Low term coverage with original');
      score -= 0.1;
    }

    // Check 3: Summary is not just a copy
    if (summary === original) {
      reasons.push('Summary is identical to original');
      score -= 0.5;
    } else {
      score += 0.2;
    }

    // Check 4: Summary has reasonable structure
    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length >= 1 && sentences.length <= 10) {
      score += 0.1;
    } else if (sentences.length > 10) {
      reasons.push('Summary too verbose');
      score -= 0.1;
    }

    // Check 5: Summary is meaningful (not just filler)
    const meaningfulWords = summaryWords.size;
    if (meaningfulWords >= 5) {
      score += 0.1;
    }

    return {
      isValid: score >= 0.5,
      score: Math.max(0, Math.min(1, score)),
      reasons
    };
  }

  checkCompleteness(summary: string, expectedItems: string[]): CompletenessResult {
    const found: string[] = [];
    const missing: string[] = [];

    for (const item of expectedItems) {
      if (summary.toLowerCase().includes(item.toLowerCase())) {
        found.push(item);
      } else {
        missing.push(item);
      }
    }

    return {
      coverage: found.length / Math.max(expectedItems.length, 1),
      found,
      missing
    };
  }

  fallback(badSummary: string, originalContent: string): string {
    // If summary is bad or low quality, return original content
    const validation = this.validate(badSummary, originalContent);
    
    if (!validation.isValid || validation.score < 0.6) {
      return originalContent;
    }
    
    return badSummary;
  }
}
