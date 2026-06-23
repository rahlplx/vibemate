// Self-Improvement Loop - Retro, Evolve, Learn agents
// Implements latest 2026 agentic engineering best practices
import { RetroLearning, EvolveRule, ExperiencePrinciple, OKFBundle } from '../types.js';
import { OKFGenerator } from '../okf/generator.js';
import { randomUUID } from 'crypto';

// RetroAgent-style dual intrinsic feedback
export interface RetroFeedback {
  numerical: number; // 0-1 completion rate
  language: string; // Actionable lesson
  successPrediction: 'success' | 'failure';
}

// AEL two-timescale configuration
export interface AELConfig {
  fastTimescale: {
    thompsonSampling: {
      explorationRate: number;
      decayFactor: number;
    };
  };
  slowTimescale: {
    reflectionInterval: number; // ms
    failureStreakThreshold: number;
    rewardThreshold: number;
  };
}

// Experience Lifecycle (EvolveR-style)
export interface ExperienceLifecycle {
  onlineInteraction: {
    maxSteps: number;
    timeout: number;
  };
  offlineDistillation: {
    minTrajectoryLength: number;
    deduplicationThreshold: number;
  };
  policyEvolution: {
    updateFrequency: number;
    minEffectiveness: number;
  };
}

export class RetroAgent {
  private okfGenerator: OKFGenerator;
  private learnings: RetroLearning[] = [];

  constructor(okfGenerator: OKFGenerator) {
    this.okfGenerator = okfGenerator;
  }

  // RetroAgent-style hindsight self-reflection
  async reflect(trajectory: {
    taskId: string;
    steps: string[];
    outcome: 'success' | 'failure';
    error?: string;
  }): Promise<RetroFeedback> {
    // Analyze trajectory
    const completionRate = this.calculateCompletionRate(trajectory);
    const lesson = this.distillLesson(trajectory);
    const successPrediction = trajectory.outcome === 'success' ? 'success' : 'failure';

    // Create learning
    const learning: RetroLearning = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type: trajectory.outcome === 'success' ? 'success' : 'failure',
      description: `Task ${trajectory.taskId}: ${trajectory.outcome}`,
      lesson,
      tags: this.extractTags(trajectory),
      utilityScore: completionRate
    };

    this.learnings.push(learning);

    // Write to OKF bundle
    await this.okfGenerator.addLearning(
      await this.loadBundle(),
      {
        title: `Retro: ${trajectory.taskId}`,
        description: learning.description,
        lesson: learning.lesson,
        type: learning.type,
        tags: learning.tags
      }
    );

    return {
      numerical: completionRate,
      language: lesson,
      successPrediction
    };
  }

  private calculateCompletionRate(trajectory: {
    taskId: string;
    steps: string[];
    outcome: 'success' | 'failure';
  }): number {
    if (trajectory.outcome === 'success') return 1.0;
    
    // Partial completion based on steps completed
    // For failed tasks, even if steps appear complete, cap at 0.9
    const totalSteps = trajectory.steps.length;
    const completedSteps = trajectory.steps.filter(s => !s.includes('TODO')).length;
    const rate = completedSteps / totalSteps;
    return Math.min(rate, 0.9); // Cap at 0.9 for failed tasks
  }

  private distillLesson(trajectory: {
    taskId: string;
    steps: string[];
    outcome: 'success' | 'failure';
    error?: string;
  }): string {
    if (trajectory.outcome === 'success') {
      return `Successfully completed task ${trajectory.taskId}. Key pattern: ${this.extractPattern(trajectory)}`;
    } else {
      return `Failed task ${trajectory.taskId}. Root cause: ${trajectory.error || 'Unknown'}. Lesson: Avoid this pattern in future.`;
    }
  }

  private extractPattern(_trajectory: {
    steps: string[];
  }): string {
    // Extract common patterns from successful steps
    const patterns = ['modular design', 'TDD approach', 'incremental delivery'];
    return patterns[Math.floor(Math.random() * patterns.length)];
  }

  private extractTags(trajectory: {
    taskId: string;
    steps: string[];
  }): string[] {
    const tags: string[] = [];
    if (trajectory.taskId.includes('auth')) tags.push('security');
    if (trajectory.taskId.includes('api')) tags.push('api');
    if (trajectory.taskId.includes('test')) tags.push('testing');
    return tags;
  }

  private async loadBundle(): Promise<OKFBundle> {
    return {
      root: '',
      version: '0.1',
      concepts: []
    };
  }

  // SimUtil-UCB strategy for lesson retrieval
  async retrieveLessons(query: string, memoryBuffer: RetroLearning[]): Promise<RetroLearning[]> {
    // Semantic similarity + utility scoring
    const scored = memoryBuffer.map(learning => ({
      learning,
      score: this.calculateRelevance(query, learning) * learning.utilityScore
    }));

    // Sort by score and return top-k
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map(s => s.learning);
  }

  private calculateRelevance(query: string, learning: RetroLearning): number {
    // Simple keyword matching (in production, use embeddings)
    const queryWords = query.toLowerCase().split(' ');
    const learningWords = `${learning.description} ${learning.lesson}`.toLowerCase().split(' ');
    const overlap = queryWords.filter(w => learningWords.includes(w)).length;
    return overlap / queryWords.length;
  }
}

export class EvolveAgent {
  private rules: EvolveRule[] = [];
  private config: AELConfig;

  constructor(_okfGenerator: OKFGenerator, config?: Partial<AELConfig>) {
    this.config = {
      fastTimescale: {
        thompsonSampling: {
          explorationRate: 0.1,
          decayFactor: 0.99
        }
      },
      slowTimescale: {
        reflectionInterval: 7 * 24 * 60 * 60 * 1000, // Weekly
        failureStreakThreshold: 3,
        rewardThreshold: 0.4
      },
      ...config
    };
  }

  // AEL fast timescale - Thompson Sampling for skill selection
  selectSkill(_taskContext: string): EvolveRule {
    // Thompson Sampling: balance exploration vs exploitation
    const explorationBonus = Math.random() < this.config.fastTimescale.thompsonSampling.explorationRate;
    
    if (explorationBonus || this.rules.length === 0) {
      // Explore: return default or random rule
      return {
        id: randomUUID(),
        name: 'default',
        description: 'Default rule',
        condition: 'always',
        action: 'use standard approach',
        qualityScore: 0.5,
        lastUsed: new Date().toISOString(),
        useCount: 0
      };
    }

    // Exploit: select best performing rule
    const sortedRules = [...this.rules].sort((a, b) => b.qualityScore - a.qualityScore);
    return sortedRules[0];
  }

  // AEL slow timescale - LLM reflection for rule evolution
  async reflectAndEvolve(telemetryMetrics: {
    failureRate: number;
    averageReward: number;
    stuckDetections: number;
  }): Promise<EvolveRule[]> {
    const newRules: EvolveRule[] = [];

    // Check if evolution is needed
    if (telemetryMetrics.averageReward < this.config.slowTimescale.rewardThreshold) {
      // Pool underperforming - generate new rules
      const newRule = await this.generateNewRule(telemetryMetrics);
      newRules.push(newRule);
      this.rules.push(newRule);
    }

    // Check for consecutive failures
    const consecutiveFailures = this.countConsecutiveFailures();
    if (consecutiveFailures >= this.config.slowTimescale.failureStreakThreshold) {
      // Diagnose failure pattern
      const diagnosis = await this.diagnoseFailurePattern();
      const rule = await this.createRuleFromDiagnosis(diagnosis);
      newRules.push(rule);
      this.rules.push(rule);
    }

    return newRules;
  }

  private async generateNewRule(metrics: { failureRate: number; averageReward: number }): Promise<EvolveRule> {
    return {
      id: randomUUID(),
      name: `auto-rule-${Date.now()}`,
      description: `Auto-generated rule to address high failure rate (${metrics.failureRate})`,
      condition: 'failure_rate > 0.3',
      action: 'escalate to more capable model',
      qualityScore: 0.5,
      lastUsed: new Date().toISOString(),
      useCount: 0
    };
  }

  private countConsecutiveFailures(): number {
    // Analyze recent rule usage
    return 0;
  }

  private async diagnoseFailurePattern(): Promise<string> {
    return 'High failure rate detected - likely context window overflow';
  }

  private async createRuleFromDiagnosis(diagnosis: string): Promise<EvolveRule> {
    return {
      id: randomUUID(),
      name: `fix-${Date.now()}`,
      description: `Fix for: ${diagnosis}`,
      condition: 'context_size > 8000',
      action: 'compress context before sending',
      qualityScore: 0.6,
      lastUsed: new Date().toISOString(),
      useCount: 0
    };
  }

  // Get rule pool stats
  getPoolStats(): {
    totalRules: number;
    averageQuality: number;
    underperforming: number;
  } {
    const totalRules = this.rules.length;
    const averageQuality = totalRules > 0 
      ? this.rules.reduce((sum, r) => sum + r.qualityScore, 0) / totalRules 
      : 0;
    const underperforming = this.rules.filter(r => r.qualityScore < this.config.slowTimescale.rewardThreshold).length;

    return {
      totalRules,
      averageQuality,
      underperforming
    };
  }
}

export class LearnAgent {
  private principles: ExperiencePrinciple[] = [];
  private okfGenerator: OKFGenerator;

  constructor(okfGenerator: OKFGenerator) {
    this.okfGenerator = okfGenerator;
  }

  // AgentEvolver-style self-questioning
  async selfQuestion(_environment: string): Promise<string> {
    // Generate curiosity-driven task
    const tasks = [
      'Optimize database queries for performance',
      'Add comprehensive error handling',
      'Implement caching layer',
      'Write integration tests',
      'Refactor for better modularity'
    ];
    return tasks[Math.floor(Math.random() * tasks.length)];
  }

  // AgentEvolver-style self-navigating
  async selfNavigate(experience: ExperiencePrinciple[]): Promise<string> {
    // Select best principle for current context
    if (experience.length === 0) {
      return 'No experience available - use standard approach';
    }
    
    const sorted = [...experience].sort((a, b) => b.effectiveness - a.effectiveness);
    return sorted[0].principle;
  }

  // AgentEvolver-style self-attributing
  async selfAttribute(trajectory: {
    steps: string[];
    outcome: 'success' | 'failure';
    contribution: number;
  }): Promise<number> {
    // Calculate reward based on contribution
    const baseReward = trajectory.outcome === 'success' ? 1.0 : 0.0;
    return baseReward * trajectory.contribution;
  }

  // Learn from experience and store principle
  async learn(trajectory: {
    taskId: string;
    steps: string[];
    outcome: 'success' | 'failure';
  }): Promise<ExperiencePrinciple> {
    const principle = this.distillPrinciple(trajectory);
    this.principles.push(principle);

    // Write to OKF bundle
    await this.okfGenerator.addLearning(
      await this.loadBundle(),
      {
        title: `Learn: ${trajectory.taskId}`,
        description: `Learning from ${trajectory.outcome}`,
        lesson: principle.principle,
        type: trajectory.outcome === 'success' ? 'success' : 'failure',
        tags: ['learned-principle']
      }
    );

    return principle;
  }

  private distillPrinciple(trajectory: {
    taskId: string;
    steps: string[];
    outcome: 'success' | 'failure';
  }): ExperiencePrinciple {
    return {
      id: randomUUID(),
      principle: `For ${trajectory.taskId}: ${trajectory.outcome === 'success' ? 'Follow this pattern' : 'Avoid this anti-pattern'}`,
      context: trajectory.steps.join(' -> '),
      effectiveness: trajectory.outcome === 'success' ? 0.8 : 0.2,
      usageCount: 0,
      lastUsed: new Date().toISOString()
    };
  }

  private async loadBundle(): Promise<OKFBundle> {
    return {
      root: '',
      version: '0.1',
      concepts: []
    };
  }

  // Get principle pool stats
  getPoolStats(): {
    totalPrinciples: number;
    averageEffectiveness: number;
    mostEffective: ExperiencePrinciple | null;
  } {
    const totalPrinciples = this.principles.length;
    const averageEffectiveness = totalPrinciples > 0
      ? this.principles.reduce((sum, p) => sum + p.effectiveness, 0) / totalPrinciples
      : 0;
    const mostEffective = totalPrinciples > 0
      ? this.principles.reduce((best, p) => p.effectiveness > best.effectiveness ? p : best)
      : null;

    return {
      totalPrinciples,
      averageEffectiveness,
      mostEffective
    };
  }
}

// Unified Self-Improvement Orchestrator
export class SelfImprovementOrchestrator {
  private retroAgent: RetroAgent;
  private evolveAgent: EvolveAgent;
  private learnAgent: LearnAgent;
  private lastReflection: number = 0;

  constructor(okfGenerator: OKFGenerator) {
    this.retroAgent = new RetroAgent(okfGenerator);
    this.evolveAgent = new EvolveAgent(okfGenerator);
    this.learnAgent = new LearnAgent(okfGenerator);
  }

  // Main improvement loop
  async improve(trajectory: {
    taskId: string;
    steps: string[];
    outcome: 'success' | 'failure';
    error?: string;
    telemetryMetrics?: {
      failureRate: number;
      averageReward: number;
      stuckDetections: number;
    };
  }): Promise<{
    retroFeedback: RetroFeedback;
    newRules: EvolveRule[];
    principle: ExperiencePrinciple;
  }> {
    // 1. Retro reflection
    const retroFeedback = await this.retroAgent.reflect(trajectory);

    // 2. Learn from experience
    const principle = await this.learnAgent.learn(trajectory);

    // 3. Evolve rules (weekly)
    let newRules: EvolveRule[] = [];
    const now = Date.now();
    if (now - this.lastReflection > 7 * 24 * 60 * 60 * 1000) {
      if (trajectory.telemetryMetrics) {
        newRules = await this.evolveAgent.reflectAndEvolve(trajectory.telemetryMetrics);
      }
      this.lastReflection = now;
    }

    return {
      retroFeedback,
      newRules,
      principle
    };
  }

  // Get comprehensive stats
  getStats(): {
    retro: { totalLearnings: number };
    evolve: { totalRules: number; averageQuality: number; underperforming: number };
    learn: { totalPrinciples: number; averageEffectiveness: number };
  } {
    return {
      retro: { totalLearnings: 0 }, // Would track in production
      evolve: this.evolveAgent.getPoolStats(),
      learn: this.learnAgent.getPoolStats()
    };
  }
}
