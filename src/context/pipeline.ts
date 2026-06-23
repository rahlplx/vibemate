// Context Engineering Pipeline - AST extraction, LLMLingua, DLP, Cache
import { ASTExtraction, CompressionResult, DLPMask, CacheEntry } from '../types.js';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { createHash } from 'crypto';

// DLP Patterns for sensitive data masking (ordered for correct matching)
const DLP_PATTERNS: DLPMask[] = [
  // AWS Keys (most specific)
  { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '***MASKED_AWS_KEY***' },
  // GitHub Tokens - match ghp_ prefix followed by alphanumeric (36-40 chars)
  { pattern: /ghp_[A-Za-z0-9]{30,40}/g, replacement: '***MASKED_GITHUB_TOKEN***' },
  // JWT Tokens
  { pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, replacement: '***MASKED_JWT***' },
  // Connection strings
  { pattern: /(?:mongodb|postgresql|mysql|redis):\/\/[^\s]+/gi, replacement: '***MASKED_CONNECTION_STRING***' },
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '***MASKED_EMAIL***' },
  // IP addresses (private)
  { pattern: /(?:10|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168)\.\d{1,3}\.\d{1,3}/g, replacement: '***MASKED_IP***' },
  // Environment variables (most generic - last)
  { pattern: /(?:API_KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY)[='":\s]+[^\s'"]+/gi, replacement: '***MASKED_ENV_VAR***' }
];

// LLMLingua-style compression rules (ordered for correct processing)
const COMPRESSION_RULES = [
  // Remove block comments first
  { pattern: /\/\*[\s\S]*?\*\//g, replacement: '' },
  // Remove single-line comments (preserve code on same line)
  { pattern: /[^\S\n]*\/\/.*$/gm, replacement: '' },
  // Remove empty lines
  { pattern: /\n\s*\n/g, replacement: '\n' },
  // Compress redundant whitespace (3+ spaces to single space)
  { pattern: / {3,}/g, replacement: ' ' },
  // Compress common phrases
  { pattern: /in order to/gi, replacement: 'to' },
  { pattern: /for the purpose of/gi, replacement: 'for' },
  { pattern: /due to the fact that/gi, replacement: 'because' },
  { pattern: /at this point in time/gi, replacement: 'now' },
  { pattern: /in the event that/gi, replacement: 'if' },
  { pattern: /on a regular basis/gi, replacement: 'regularly' }
];

export class ContextPipeline {
  private root: string;
  private cacheDir: string;
  private cache: Map<string, CacheEntry> = new Map();

  constructor(root: string) {
    this.root = root;
    this.cacheDir = join(root, '.vibe', 'context-cache');
  }

  // AST-style extraction - extract only relevant code sections
  async extractRelevant(filePath: string, targetFunction?: string): Promise<ASTExtraction> {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    
    let relevantCode: string;
    let tokenReduction: number;

    if (targetFunction) {
      // Extract specific function and its imports
      const functionStart = lines.findIndex(l => l.includes(`function ${targetFunction}`) || l.includes(`const ${targetFunction}`));
      if (functionStart === -1) {
        // Function not found, return imports only
        relevantCode = lines.filter(l => l.startsWith('import') || l.startsWith('export')).join('\n');
        tokenReduction = ((lines.length - relevantCode.split('\n').length) / lines.length) * 100;
      } else {
        // Find function end (simple heuristic: matching brace)
        let braceCount = 0;
        let functionEnd = functionStart;
        for (let i = functionStart; i < lines.length; i++) {
          braceCount += (lines[i].match(/{/g) || []).length;
          braceCount -= (lines[i].match(/}/g) || []).length;
          if (braceCount === 0 && i > functionStart) {
            functionEnd = i;
            break;
          }
        }
        
        // Get imports + function
        const imports = lines.filter(l => l.startsWith('import')).join('\n');
        const functionCode = lines.slice(functionStart, functionEnd + 1).join('\n');
        relevantCode = `${imports}\n\n${functionCode}`;
        tokenReduction = ((lines.length - relevantCode.split('\n').length) / lines.length) * 100;
      }
    } else {
      // Extract exports and public interfaces only
      relevantCode = lines.filter(l => 
        l.startsWith('export') || 
        l.startsWith('import') ||
        l.includes('interface ') ||
        l.includes('type ') ||
        l.includes('class ')
      ).join('\n');
      tokenReduction = ((lines.length - relevantCode.split('\n').length) / lines.length) * 100;
    }

    return {
      filePath,
      relevantCode,
      tokenReduction
    };
  }

  // LLMLingua-style compression
  compress(content: string): CompressionResult {
    let compressed = content;
    
    for (const rule of COMPRESSION_RULES) {
      compressed = compressed.replace(rule.pattern, rule.replacement);
    }
    
    const reductionPercent = ((content.length - compressed.length) / content.length) * 100;
    
    return {
      original: content,
      compressed,
      reductionPercent
    };
  }

  // DLP Sanitization
  sanitize(content: string): string {
    let sanitized = content;
    
    for (const mask of DLP_PATTERNS) {
      sanitized = sanitized.replace(mask.pattern, mask.replacement);
    }
    
    return sanitized;
  }

  // Re-inject masked values after cloud response
  reinject(original: string, _sanitized: string, response: string): string {
    // Simple approach: replace masked markers with original values
    let result = response;
    
    for (const mask of DLP_PATTERNS) {
      const matches = original.match(mask.pattern);
      if (matches) {
        for (const match of matches) {
          result = result.replace(mask.replacement, match);
        }
      }
    }
    
    return result;
  }

  // Context caching with hash-based keys
  async cacheContext(files: string[]): Promise<string> {
    // Create hash from file contents
    const contents = await Promise.all(
      files.map(f => readFile(join(this.root, f), 'utf-8').catch(() => ''))
    );
    const combined = contents.join('\n');
    const hash = createHash('sha256').update(combined).digest('hex');
    
    // Check cache
    const cached = this.cache.get(hash);
    if (cached) {
      return cached.key;
    }
    
    // Store in cache
    const entry: CacheEntry = {
      key: hash,
      content: combined,
      hash,
      timestamp: Date.now()
    };
    this.cache.set(hash, entry);
    
    // Persist cache
    await this.persistCache();
    
    return hash;
  }

  async getCachedContext(hash: string): Promise<string | null> {
    const entry = this.cache.get(hash);
    return entry?.content || null;
  }

  private async persistCache(): Promise<void> {
    try {
      const { mkdir } = await import('fs/promises');
      await mkdir(this.cacheDir, { recursive: true });
      
      const cacheFile = join(this.cacheDir, 'context-cache.json');
      const cacheObj = Object.fromEntries(this.cache);
      await writeFile(cacheFile, JSON.stringify(cacheObj, null, 2));
    } catch {
      // Cache persistence is best-effort
    }
  }

  async loadCache(): Promise<void> {
    try {
      const { readFile } = await import('fs/promises');
      const cacheFile = join(this.cacheDir, 'context-cache.json');
      const content = await readFile(cacheFile, 'utf-8');
      const cacheObj = JSON.parse(content);
      this.cache = new Map(Object.entries(cacheObj));
    } catch {
      // Start with empty cache
    }
  }

  // Full pipeline: extract -> compress -> sanitize -> cache
  async process(filePath: string, targetFunction?: string): Promise<{
    extracted: ASTExtraction;
    compressed: CompressionResult;
    sanitized: string;
    cacheKey: string;
  }> {
    // Extract relevant code
    const extracted = await this.extractRelevant(filePath, targetFunction);
    
    // Compress
    const compressed = this.compress(extracted.relevantCode);
    
    // Sanitize
    const sanitized = this.sanitize(compressed.compressed);
    
    // Cache
    const cacheKey = await this.cacheContext([filePath]);
    
    return {
      extracted,
      compressed,
      sanitized,
      cacheKey
    };
  }

  // Get token estimate (rough: 1 token ≈ 4 chars)
  estimateTokens(content: string): number {
    return Math.ceil(content.length / 4);
  }

  // Get cache statistics
  getStats(): {
    totalEntries: number;
    totalSize: number;
    hitRate: number;
  } {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.content.length;
    }
    
    return {
      totalEntries: this.cache.size,
      totalSize,
      hitRate: 0 // Would need to track hits/misses
    };
  }
}
