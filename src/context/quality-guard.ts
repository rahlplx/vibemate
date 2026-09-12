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
    // OPTIMIZATION: Avoid `original.toLowerCase().split(/\s+/)` which allocates a large array and Set
    // for large original texts. Instead, collect target summary words (> 3 chars) in a Set and scan
    // `original.toLowerCase()` with regex matching, early-exiting when all target words are found.
    const summaryRaw = summary.toLowerCase().split(/\s+/);
    const targetWords = new Set<string>();
    const summaryUniqueWords = new Set<string>();

    for (let i = 0; i < summaryRaw.length; i++) {
      const w = summaryRaw[i];
      if (w.length > 0) {
        summaryUniqueWords.add(w);
        if (w.length > 3) {
          targetWords.add(w);
        }
      }
    }

    const summaryUniqueCount = summaryUniqueWords.size;
    let commonWords = 0;

    if (targetWords.size > 0) {
      const lowerOriginal = original.toLowerCase();
      const wordRegex = /\S+/g;
      let match: RegExpExecArray | null;

      while ((match = wordRegex.exec(lowerOriginal)) !== null) {
        const word = match[0];
        if (targetWords.has(word)) {
          commonWords++;
          targetWords.delete(word);
          if (targetWords.size === 0) break; // Early exit once all target words are found
        }
      }
    }
    
    const termCoverage = commonWords / Math.max(summaryUniqueCount, 1);
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
    const meaningfulWords = summaryUniqueCount;
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
