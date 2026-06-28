// Cost-Aware Dynamic Routing - Route tasks to optimal model based on complexity
import { ComplexityLevel, RoutingDecision, CloudProvider } from '../types.js';
import { VibemateExtendedConfig } from '../shared/config.js';
import { ObservationEngine } from '../improve/observation.js';

// Model configurations with pricing (June 2026)
const MODEL_CONFIGS: Record<string, {
  provider: string;
  model: string;
  costPer1kInput: number;
  costPer1kOutput: number;
  maxTokens: number;
  latency: 'fast' | 'medium' | 'slow';
  capability: 'basic' | 'intermediate' | 'advanced';
}> = {
  // Anthropic models
  'claude-haiku': {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
    maxTokens: 8192,
    latency: 'fast',
    capability: 'basic'
  },
  'claude-sonnet': {
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
    maxTokens: 8192,
    latency: 'medium',
    capability: 'intermediate'
  },
  'claude-opus': {
    provider: 'anthropic',
    model: 'claude-opus-4-20250514',
    costPer1kInput: 0.015,
    costPer1kOutput: 0.075,
    maxTokens: 8192,
    latency: 'slow',
    capability: 'advanced'
  },
  // Google models
  'gemini-flash': {
    provider: 'google',
    model: 'gemini-2.5-flash',
    costPer1kInput: 0.000375,
    costPer1kOutput: 0.0015,
    maxTokens: 8192,
    latency: 'fast',
    capability: 'basic'
  },
  'gemini-pro': {
    provider: 'google',
    model: 'gemini-2.5-pro',
    costPer1kInput: 0.00125,
    costPer1kOutput: 0.005,
    maxTokens: 8192,
    latency: 'medium',
    capability: 'intermediate'
  },
  // OpenAI models
  'gpt-4o-mini': {
    provider: 'openai',
    model: 'gpt-4o-mini',
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
    maxTokens: 16384,
    latency: 'fast',
    capability: 'basic'
  },
  'gpt-4o': {
    provider: 'openai',
    model: 'gpt-4o',
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
    maxTokens: 16384,
    latency: 'medium',
    capability: 'intermediate'
  },
  'o3-mini': {
    provider: 'openai',
    model: 'o3-mini',
    costPer1kInput: 0.0011,
    costPer1kOutput: 0.0044,
    maxTokens: 200000,
    latency: 'medium',
    capability: 'advanced'
  }
};

// Complexity scoring criteria
interface ComplexityCriteria {
  filesImplicated: number;
  requiresReasoning: boolean;
  testOutputSize: number;
  hasDependencies: boolean;
  isRefactoring: boolean;
  requiresSecurity: boolean;
}

export class CostAwareRouter {
  private budget: number;
  private totalCost: number = 0;
  private modelConfigs: typeof MODEL_CONFIGS;
  private observationEngine?: ObservationEngine;

  constructor(_providers: CloudProvider[], budget: number, config?: VibemateExtendedConfig, observationEngine?: ObservationEngine) {
    this.budget = budget;
    this.observationEngine = observationEngine;
    // Deep-copy so per-instance overrides don't pollute the shared module constant
    this.modelConfigs = Object.fromEntries(
      Object.entries(MODEL_CONFIGS).map(([k, v]) => [k, { ...v }])
    ) as typeof MODEL_CONFIGS;
    if (config?.llmProviders) {
      for (const provider of config.llmProviders) {
        const key = provider.model;
        if (this.modelConfigs[key]) {
          this.modelConfigs[key] = {
            ...this.modelConfigs[key],
            costPer1kInput: provider.costPer1kInput,
            costPer1kOutput: provider.costPer1kOutput,
            ...(provider.maxTokens ? { maxTokens: provider.maxTokens } : {})
          };
        }
      }
    }
  }

  // Calculate task complexity score
  calculateComplexity(criteria: ComplexityCriteria): number {
    let score = 0;
    
    // Files implicated (each file adds 2 points)
    score += criteria.filesImplicated * 2;
    
    // Reasoning required (adds 10 points)
    if (criteria.requiresReasoning) score += 10;
    
    // Test output size (large output adds 5 points)
    if (criteria.testOutputSize > 1000) score += 5;
    
    // Has dependencies (adds 3 points)
    if (criteria.hasDependencies) score += 3;
    
    // Is refactoring (adds 4 points)
    if (criteria.isRefactoring) score += 4;
    
    // Requires security (adds 6 points)
    if (criteria.requiresSecurity) score += 6;
    
    return score;
  }

  // Determine complexity level from score
  getComplexityLevel(score: number): ComplexityLevel {
    if (score <= 5) return 'low';
    if (score <= 15) return 'medium';
    return 'high';
  }

  // Route task to optimal model
  route(criteria: ComplexityCriteria): RoutingDecision {
    const score = this.calculateComplexity(criteria);
    let level = this.getComplexityLevel(score);

    // Escalate if ObservationEngine reports 3+ recent high-confidence failures
    if (level === 'low' && this.observationEngine) {
      const recentFailures = this.observationEngine.getInsights(0.9)
        .filter(o => o.type === 'failure').length;
      if (recentFailures >= 3) {
        level = 'medium';
      }
    }
    
    // Select model based on complexity
    let selectedModel: string;
    let reason: string;
    
    switch (level) {
      case 'low':
        // Use cheapest, fastest model
        selectedModel = this.selectCheapest('basic');
        reason = `Low complexity (${score}pts) - using cheapest model`;
        break;
      case 'medium':
        // Use balanced model
        selectedModel = this.selectBalanced('intermediate');
        reason = `Medium complexity (${score}pts) - using balanced model`;
        break;
      case 'high':
        // Use most capable model
        selectedModel = this.selectMostCapable('advanced');
        reason = `High complexity (${score}pts) - using most capable model`;
        break;
    }

    const modelConfig = this.modelConfigs[selectedModel];
    const estimatedTokens = this.estimateTokens(criteria);
    const estimatedCost = this.calculateCost(selectedModel, estimatedTokens);

    // Check budget
    if (this.totalCost + estimatedCost > this.budget) {
      // Downgrade to cheaper model
      const cheaperModel = this.selectCheapest(modelConfig.capability);
      const cheaperCost = this.calculateCost(cheaperModel, estimatedTokens);

      if (this.totalCost + cheaperCost <= this.budget) {
        selectedModel = cheaperModel;
        reason += ` (downgraded due to budget: $${(this.budget - this.totalCost).toFixed(2)} remaining)`;
      }
    }

    return {
      level,
      model: this.modelConfigs[selectedModel].model,
      provider: this.modelConfigs[selectedModel].provider,
      estimatedCost,
      reason,
      contextWindow: this.modelConfigs[selectedModel].maxTokens
    };
  }

  private selectCheapest(minCapability: 'basic' | 'intermediate' | 'advanced'): string {
    const capabilityOrder = { basic: 0, intermediate: 1, advanced: 2 };

    let cheapest: string | null = null;
    let cheapestCost = Infinity;

    for (const [name, config] of Object.entries(this.modelConfigs)) {
      if (capabilityOrder[config.capability] >= capabilityOrder[minCapability]) {
        const cost = config.costPer1kInput + config.costPer1kOutput;
        if (cost < cheapestCost) {
          cheapestCost = cost;
          cheapest = name;
        }
      }
    }

    return cheapest || 'claude-haiku';
  }

  private selectBalanced(minCapability: 'basic' | 'intermediate' | 'advanced'): string {
    // Balance cost and capability
    const capabilityOrder = { basic: 0, intermediate: 1, advanced: 2 };

    let best: string | null = null;
    let bestScore = -Infinity;

    for (const [name, config] of Object.entries(this.modelConfigs)) {
      if (capabilityOrder[config.capability] >= capabilityOrder[minCapability]) {
        // Score = capability - normalized cost
        const cost = config.costPer1kInput + config.costPer1kOutput;
        const normalizedCost = cost / 0.1; // Normalize to 0-1 range
        const score = capabilityOrder[config.capability] - normalizedCost;

        if (score > bestScore) {
          bestScore = score;
          best = name;
        }
      }
    }

    return best || 'claude-sonnet';
  }

  private selectMostCapable(minCapability: 'basic' | 'intermediate' | 'advanced'): string {
    const capabilityOrder = { basic: 0, intermediate: 1, advanced: 2 };

    let mostCapable: string | null = null;
    let highestCapability = -1;

    for (const [name, config] of Object.entries(this.modelConfigs)) {
      if (capabilityOrder[config.capability] >= capabilityOrder[minCapability]) {
        if (capabilityOrder[config.capability] > highestCapability) {
          highestCapability = capabilityOrder[config.capability];
          mostCapable = name;
        }
      }
    }

    return mostCapable || 'claude-opus';
  }

  private estimateTokens(criteria: ComplexityCriteria): number {
    // Rough estimate based on complexity
    let tokens = 1000; // Base tokens
    tokens += criteria.filesImplicated * 500;
    tokens += criteria.testOutputSize;
    if (criteria.requiresReasoning) tokens += 2000;
    return tokens;
  }

  private calculateCost(modelName: string, tokens: number): number {
    const config = this.modelConfigs[modelName];
    if (!config) return 0;
    
    const inputTokens = Math.floor(tokens * 0.7); // 70% input
    const outputTokens = tokens - inputTokens;
    
    const inputCost = (inputTokens / 1000) * config.costPer1kInput;
    const outputCost = (outputTokens / 1000) * config.costPer1kOutput;
    
    return inputCost + outputCost;
  }

  // Record actual cost after execution
  recordCost(actualCost: number): void {
    this.totalCost += actualCost;
  }

  // Check if budget allows
  canAfford(criteria: ComplexityCriteria): boolean {
    const score = this.calculateComplexity(criteria);
    const level = this.getComplexityLevel(score);
    const model = level === 'low' ? 'claude-haiku' : level === 'medium' ? 'claude-sonnet' : 'claude-opus';
    const estimatedCost = this.calculateCost(model, this.estimateTokens(criteria));
    return this.totalCost + estimatedCost <= this.budget;
  }

  // Get budget status
  getBudgetStatus(): {
    totalBudget: number;
    totalCost: number;
    remaining: number;
    percentUsed: number;
  } {
    return {
      totalBudget: this.budget,
      totalCost: this.totalCost,
      remaining: this.budget - this.totalCost,
      percentUsed: (this.totalCost / this.budget) * 100
    };
  }

  // Get routing recommendations for a set of tasks
  recommendRouting(tasks: ComplexityCriteria[]): {
    tasks: { criteria: ComplexityCriteria; decision: RoutingDecision }[];
    totalEstimatedCost: number;
    withinBudget: boolean;
  } {
    const decisions = tasks.map(criteria => ({
      criteria,
      decision: this.route(criteria)
    }));
    
    const totalEstimatedCost = decisions.reduce((sum, d) => sum + d.decision.estimatedCost, 0);
    
    return {
      tasks: decisions,
      totalEstimatedCost,
      withinBudget: this.totalCost + totalEstimatedCost <= this.budget
    };
  }
}

// Fallback logic for repeated failures with circuit breaker
export class FallbackManager {
  private failureCounts: Map<string, number> = new Map();
  private cooldownUntil: Map<string, number> = new Map();
  private escalationThreshold: number = 3;
  private cooldownMs: number = 60_000;

  constructor(config?: { escalationThreshold?: number; cooldownMs?: number }) {
    if (config?.escalationThreshold !== undefined) this.escalationThreshold = config.escalationThreshold;
    if (config?.cooldownMs !== undefined) this.cooldownMs = config.cooldownMs;
  }

  recordFailure(model: string): void {
    const count = this.failureCounts.get(model) || 0;
    this.failureCounts.set(model, count + 1);
    if (count + 1 >= this.escalationThreshold) {
      this.cooldownUntil.set(model, Date.now() + this.cooldownMs);
    }
  }

  recordSuccess(model: string): void {
    this.failureCounts.set(model, 0);
    this.cooldownUntil.delete(model);
  }

  shouldEscalate(model: string): boolean {
    const failures = this.failureCounts.get(model) || 0;
    return failures >= this.escalationThreshold;
  }

  isCircuitOpen(model: string): boolean {
    const until = this.cooldownUntil.get(model);
    if (!until) return false;
    if (Date.now() >= until) {
      this.cooldownUntil.delete(model);
      return false;
    }
    return true;
  }

  getNextModel(currentModel: string): string {
    const modelOrder = ['claude-haiku', 'gemini-flash', 'gpt-4o-mini', 'claude-sonnet', 'gemini-pro', 'gpt-4o', 'claude-opus', 'o3-mini'];
    const currentIndex = modelOrder.indexOf(currentModel);
    
    if (currentIndex === -1 || currentIndex === modelOrder.length - 1) {
      return currentModel;
    }
    
    return modelOrder[currentIndex + 1];
  }

  resetFailures(model: string): void {
    this.failureCounts.set(model, 0);
    this.cooldownUntil.delete(model);
  }
}
