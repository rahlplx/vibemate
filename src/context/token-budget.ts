// Token Budget Allocator - Binary search + adaptive chunks (inspired by Aider + OpenClaw)
interface BudgetAllocation {
  system: number;
  repoMap: number;
  files: number;
  history: number;
  tool: number;
}

interface ContentChunk {
  type: 'code' | 'comment' | 'import' | 'string' | 'whitespace';
  content: string;
  ratio: number;
}

export class TokenBudgetAllocator {
  // Approximate token count (1 token ≈ 4 chars for English, 2 chars for CJK)
  // Optimized: uses indexed loop to avoid string iterator allocations, supports maxLen and stopAtTokenCount for early-exit.
  countTokens(text: string, maxLen?: number, stopAtTokenCount?: number): number {
    if (!text) return 0;
    
    const limit = maxLen !== undefined ? Math.min(text.length, maxLen) : text.length;
    let asciiChars = 0;
    let nonAsciiChars = 0;
    
    for (let i = 0; i < limit; i++) {
      if (text.charCodeAt(i) < 128) {
        asciiChars++;
      } else {
        nonAsciiChars++;
      }
      if (stopAtTokenCount !== undefined) {
        const tokens = Math.ceil(asciiChars / 4) + Math.ceil(nonAsciiChars / 2);
        if (tokens > stopAtTokenCount) {
          return tokens;
        }
      }
    }
    
    return Math.ceil(asciiChars / 4) + Math.ceil(nonAsciiChars / 2);
  }

  allocate(config: { totalBudget: number; layers: string[] }): BudgetAllocation {
    const { totalBudget } = config;
    
    // Allocation ratios (sum = 1.0)
    const ratios = {
      system: 0.10,   // 10% for system prompt
      repoMap: 0.40,  // 40% for repo map
      files: 0.30,    // 30% for file content
      history: 0.15,  // 15% for chat history
      tool: 0.05      // 5% for tool-specific
    };
    
    return {
      system: Math.floor(totalBudget * ratios.system),
      repoMap: Math.floor(totalBudget * ratios.repoMap),
      files: Math.floor(totalBudget * ratios.files),
      history: Math.floor(totalBudget * ratios.history),
      tool: Math.floor(totalBudget * ratios.tool)
    };
  }

  fitToBudget(content: string, budget: number): string {
    // Early exit check with stopAtTokenCount so oversized content returns quickly without full scanning
    const contentTokens = this.countTokens(content, undefined, budget);
    
    if (contentTokens <= budget) {
      return content;
    }
    
    // Single-pass bounded scan (with 10% safety margin). Since ASCII is 4 chars/token, bestFitLen cannot exceed safeBudget * 4.
    const safeBudget = Math.floor(budget * 0.9);
    const maxChars = Math.min(content.length, safeBudget * 4);

    let asciiChars = 0;
    let nonAsciiChars = 0;
    let bestFitLen = 0;
    
    for (let i = 0; i < maxChars; i++) {
      if (content.charCodeAt(i) < 128) {
        asciiChars++;
      } else {
        nonAsciiChars++;
      }
      const tokens = Math.ceil(asciiChars / 4) + Math.ceil(nonAsciiChars / 2);
      if (tokens <= safeBudget) {
        bestFitLen = i + 1;
      } else {
        break;
      }
    }
    
    return content.slice(0, bestFitLen) + '\n// [truncated to fit token budget]';
  }

  adaptRatios(chunks: { type: string; content: string }[]): ContentChunk[] {
    // Base ratios for different content types
    const baseRatios: Record<string, number> = {
      code: 1.0,
      import: 0.9,
      string: 0.7,
      comment: 0.4,
      whitespace: 0.1
    };
    
    return chunks.map(chunk => ({
      type: chunk.type as ContentChunk['type'],
      content: chunk.content,
      ratio: baseRatios[chunk.type] || 0.5
    }));
  }
}
