// Context Engine - Orchestrator (integrates all context modules)
import { RepoMap } from './repo-map.js';
import { TokenBudgetAllocator } from './token-budget.js';
import { ProvenanceEngine } from './provenance.js';
import { CacheBoundary } from './cache-boundary.js';
import { QualityGuard } from './quality-guard.js';
import { SkillAutoActivator } from './skill-auto.js';

interface AssembledContext {
  repoMap: string;
  provenance: string;
  cacheKey: string;
  tokenCount: number;
  budget: {
    system: number;
    repoMap: number;
    files: number;
    history: number;
    tool: number;
  };
  skills: string[];
}

interface EngineStats {
  totalAssemblies: number;
  cacheHitRate: number;
  avgTokenCount: number;
}

export class ContextEngine {
  private root: string;
  private repoMap: RepoMap;
  private tokenBudget: TokenBudgetAllocator;
  private provenance: ProvenanceEngine;
  private cacheBoundary: CacheBoundary;
  private qualityGuard: QualityGuard;
  private skillActivator: SkillAutoActivator;
  
  private assemblyCount: number = 0;
  private totalTokens: number = 0;
  private cacheHits: number = 0;

  constructor(root: string) {
    this.root = root;
    this.repoMap = new RepoMap(root);
    this.tokenBudget = new TokenBudgetAllocator();
    this.provenance = new ProvenanceEngine();
    this.cacheBoundary = new CacheBoundary();
    this.qualityGuard = new QualityGuard();
    this.skillActivator = new SkillAutoActivator();
  }

  async assemble(toolName: string, args: Record<string, unknown>): Promise<AssembledContext> {
    // Build repo map if needed
    await this.repoMap.build();

    // Get relevant context for the task
    const task = `${toolName} ${JSON.stringify(args)}`;
    const repoContext = this.repoMap.getRelevantContext(task);

    // Allocate token budget
    const budget = this.tokenBudget.allocate({
      totalBudget: 80000,
      layers: ['system', 'repo-map', 'files', 'history', 'tool']
    });

    // Fit repo map to budget
    const fittedRepoMap = this.tokenBudget.fitToBudget(repoContext, budget.repoMap);

    // Tag provenance
    const taggedPiece = this.provenance.tag({
      content: fittedRepoMap,
      provenance: 'codebase',
      source: this.root
    });

    // Split cache boundary
    const prompt = this.cacheBoundary.split({
      stable: ['You are a helpful coding assistant', 'Rules: be concise, follow TDD'],
      dynamic: [fittedRepoMap, `Tool: ${toolName}`, `Args: ${JSON.stringify(args)}`]
    });

    // Activate relevant skills
    const skills = this.skillActivator.activate(task);

    // Calculate token count
    const tokenCount = this.tokenBudget.countTokens(prompt.stablePrefix + prompt.dynamicSuffix);

    // Generate stable cache key (based on content, not time)
    const cacheKey = `${toolName}-${this.repoMap.buildTime}`;

    // Update stats
    this.assemblyCount++;
    this.totalTokens += tokenCount;

    return {
      repoMap: fittedRepoMap,
      provenance: JSON.stringify(taggedPiece),
      cacheKey,
      tokenCount,
      budget,
      skills
    };
  }

  getStats(): EngineStats {
    return {
      totalAssemblies: this.assemblyCount,
      cacheHitRate: this.cacheBoundary.getStats().hitRate,
      avgTokenCount: this.assemblyCount > 0 ? this.totalTokens / this.assemblyCount : 0
    };
  }
}
