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
  countTokens(text: string): number {
    if (!text) return 0;
    
    // Count ASCII vs non-ASCII characters
    let asciiChars = 0;
    let nonAsciiChars = 0;
    
    for (const char of text) {
      if (char.charCodeAt(0) < 128) {
        asciiChars++;
      } else {
        nonAsciiChars++;
      }
    }
    
    // Approximate: ASCII ~4 chars/token, non-ASCII ~2 chars/token
    const asciiTokens = Math.ceil(asciiChars / 4);
    const nonAsciiTokens = Math.ceil(nonAsciiChars / 2);
    
    return asciiTokens + nonAsciiTokens;
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
    const contentTokens = this.countTokens(content);
    
    if (contentTokens <= budget) {
      return content;
    }
    
    // Binary search for the right truncation point (with 10% safety margin)
    const safeBudget = Math.floor(budget * 0.9);
    let low = 0;
    let high = content.length;
    let bestFit = '';
    
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const truncated = content.slice(0, mid);
      const tokens = this.countTokens(truncated);
      
      if (tokens <= safeBudget) {
        bestFit = truncated;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    
    return bestFit + '\n// [truncated to fit token budget]';
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
