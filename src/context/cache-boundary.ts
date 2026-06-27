// Cache Boundary - Stable prefix + dynamic suffix (inspired by OpenClaw)
interface SplitPrompt {
  stablePrefix: string;
  dynamicSuffix: string;
  totalTokens: number;
}

interface CacheStats {
  totalRequests: number;
  cacheHits: number;
  hitRate: number;
}

export class CacheBoundary {
  private stableHash: string = '';
  private stats: CacheStats = {
    totalRequests: 0,
    cacheHits: 0,
    hitRate: 0
  };

  split(prompt: { stable: string[]; dynamic: string[] }): SplitPrompt {
    const stablePrefix = prompt.stable.join('\n');
    const dynamicSuffix = prompt.dynamic.join('\n');
    
    const currentHash = this.hash(stablePrefix);
    
    // Track cache hits
    this.stats.totalRequests++;
    if (this.stableHash === currentHash && this.stableHash !== '') {
      this.stats.cacheHits++;
    }
    this.stableHash = currentHash;
    this.stats.hitRate = this.stats.cacheHits / this.stats.totalRequests;
    
    // Rough token estimate
    const totalTokens = Math.ceil((stablePrefix.length + dynamicSuffix.length) / 4);
    
    return {
      stablePrefix,
      dynamicSuffix,
      totalTokens
    };
  }

  private hash(text: string): string {
    // Simple hash for cache key comparison
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }
}
