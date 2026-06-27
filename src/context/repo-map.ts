// Repo Map - PageRank-based symbol ranking (inspired by Aider)
import { readFile, readdir, stat } from 'fs/promises';
import { join, relative } from 'path';

interface Symbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable';
  file: string;
  line: number;
  imports: string[];
  exports: string[];
  score?: number;
}

interface Ranking {
  name: string;
  score: number;
  file: string;
  kind: Symbol['kind'];
}

export class RepoMap {
  private root: string;
  symbols: Map<string, Symbol> = new Map();
  private adjacency: Map<string, Set<string>> = new Map();
  buildTime: number = 0;
  private lastMtime: number = 0;

  constructor(root: string) {
    this.root = root;
  }

  async build(): Promise<void> {
    const currentMtime = await this.getLatestMtime();
    if (currentMtime === this.lastMtime && this.symbols.size > 0) {
      return; // No changes, skip rebuild
    }

    this.symbols.clear();
    this.adjacency.clear();

    const files = await this.findFiles(this.root);
    for (const file of files) {
      await this.parseFile(file);
    }

    this.buildPageRank();
    this.lastMtime = currentMtime;
    this.buildTime = Date.now();
  }

  private async getLatestMtime(): Promise<number> {
    let latest = 0;
    const files = await this.findFiles(this.root);
    for (const file of files) {
      const s = await stat(file);
      if (s.mtimeMs > latest) latest = s.mtimeMs;
    }
    return latest;
  }

  private async findFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files.push(...await this.findFiles(fullPath));
        }
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  private async parseFile(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const relPath = relative(this.root, filePath);

      let currentImports: string[] = [];
      let currentExports: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Extract imports
        const importMatch = line.match(/import\s+.*\s+from\s+['"](.+)['"]/);
        if (importMatch) {
          currentImports.push(importMatch[1]);
          continue;
        }

        // Extract exports
        const exportMatch = line.match(/export\s+(?:function|class|interface|type|const|let|var)\s+(\w+)/);
        if (exportMatch) {
          const name = exportMatch[1];
          const kind = line.includes('function') ? 'function' :
                      line.includes('class') ? 'class' :
                      line.includes('interface') ? 'interface' :
                      line.includes('type') ? 'type' : 'variable';
          
          this.symbols.set(name, {
            name,
            kind,
            file: relPath,
            line: i + 1,
            imports: currentImports,
            exports: currentExports
          });

          // Track adjacency (what this symbol depends on)
          if (!this.adjacency.has(name)) {
            this.adjacency.set(name, new Set());
          }
          for (const imp of currentImports) {
            this.adjacency.get(name)!.add(imp);
          }

          currentImports = [];
          currentExports = [];
        }
      }
    } catch (error) {
      console.error(`[RepoMap] Failed to parse file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildPageRank(): void {
    const dampingFactor = 0.85;
    const iterations = 20;
    const n = this.symbols.size;
    
    if (n === 0) return;

    // Initialize scores
    const scores = new Map<string, number>();
    for (const name of this.symbols.keys()) {
      scores.set(name, 1 / n);
    }

    // Build reverse adjacency (what imports each symbol)
    const reverseAdjacency = new Map<string, Set<string>>();
    for (const [source, deps] of this.adjacency) {
      for (const dep of deps) {
        if (!reverseAdjacency.has(dep)) {
          reverseAdjacency.set(dep, new Set());
        }
        reverseAdjacency.get(dep)!.add(source);
      }
    }

    // Iterate PageRank
    for (let iter = 0; iter < iterations; iter++) {
      const newScores = new Map<string, number>();
      
      for (const name of this.symbols.keys()) {
        let incomingScore = 0;
        
        // Find symbols that import this one
        const importers = reverseAdjacency.get(name) || new Set();
        for (const importer of importers) {
          const outDegree = this.adjacency.get(importer)?.size || 1;
          incomingScore += (scores.get(importer) || 0) / outDegree;
        }
        
        newScores.set(name, (1 - dampingFactor) / n + dampingFactor * incomingScore);
      }
      
      // Update scores
      for (const [name, score] of newScores) {
        scores.set(name, score);
      }
    }

    // Update symbol scores
    for (const [name, score] of scores) {
      const symbol = this.symbols.get(name);
      if (symbol) {
        symbol.score = score;
      }
    }
  }

  getRankings(): Ranking[] {
    const rankings: Ranking[] = [];
    
    for (const [name, symbol] of this.symbols) {
      rankings.push({
        name,
        score: symbol.score || 0,
        file: symbol.file,
        kind: symbol.kind
      });
    }
    
    return rankings.sort((a, b) => b.score - a.score);
  }

  getRelevantContext(task: string): string {
    const rankings = this.getRankings();
    const context: string[] = [];
    
    // Simple keyword matching (could be enhanced with NLP)
    const keywords = task.toLowerCase().split(/\s+/);
    
    for (const ranking of rankings.slice(0, 10)) {
      const nameLower = ranking.name.toLowerCase();
      const isRelevant = keywords.some(kw => nameLower.includes(kw));
      
      if (isRelevant || ranking.score > 0.1) {
        const symbol = this.symbols.get(ranking.name);
        context.push(`${ranking.file}:${ranking.name} (${ranking.kind})`);
      }
    }
    
    return context.join('\n');
  }
}
