// TDD Tests for Self-Improvement Loop
import { describe, it, expect, afterEach , beforeEach} from 'bun:test';
import { 
  SelfImprovementOrchestrator,
  RetroAgent,
  EvolveAgent,
  LearnAgent
} from '../../src/evolve/index.js';
import { OKFGenerator } from '../../src/okf/generator.js';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Self-Improvement Loop', () => {
  let testDir: string;
  let okfGenerator: OKFGenerator;
  let orchestrator: SelfImprovementOrchestrator;

  beforeEach(async () => {
    testDir = join(tmpdir(), `evolve-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    okfGenerator = new OKFGenerator(testDir);
    orchestrator = new SelfImprovementOrchestrator(okfGenerator);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('RetroAgent', () => {
    let retroAgent: RetroAgent;

    beforeEach(() => {
      retroAgent = new RetroAgent(okfGenerator);
    });

    describe('reflect', () => {
      it('should generate retro feedback for successful task', async () => {
        const feedback = await retroAgent.reflect({
          taskId: 'task-1',
          steps: ['analyze', 'implement', 'test'],
          outcome: 'success'
        });

        expect(feedback).toBeDefined();
        expect(feedback.numerical).toBe(1.0);
        expect(feedback.successPrediction).toBe('success');
        expect(feedback.language).toContain('Successfully completed');
      });

      it('should generate retro feedback for failed task', async () => {
        const feedback = await retroAgent.reflect({
          taskId: 'task-2',
          steps: ['analyze', 'implement'],
          outcome: 'failure',
          error: 'Test failed'
        });

        expect(feedback.numerical).toBeLessThan(1.0);
        expect(feedback.successPrediction).toBe('failure');
        expect(feedback.language).toContain('Failed');
      });

      it('should calculate partial completion rate', async () => {
        const feedback = await retroAgent.reflect({
          taskId: 'task-3',
          steps: ['TODO step 1', 'completed step 2', 'TODO step 3'],
          outcome: 'failure'
        });

        expect(feedback.numerical).toBe(1/3); // 1 completed out of 3
      });
    });

    describe('retrieveLessons', () => {
      it('should retrieve relevant lessons', async () => {
        // Add some learnings
        await retroAgent.reflect({
          taskId: 'auth-task',
          steps: ['implement auth'],
          outcome: 'success'
        });

        await retroAgent.reflect({
          taskId: 'db-task',
          steps: ['implement database'],
          outcome: 'success'
        });

        const lessons = await retroAgent.retrieveLessons('authentication', [
          {
            id: '1',
            timestamp: new Date().toISOString(),
            type: 'success',
            description: 'Auth task completed',
            lesson: 'Use JWT for auth',
            tags: ['security', 'auth'],
            utilityScore: 0.9
          },
          {
            id: '2',
            timestamp: new Date().toISOString(),
            type: 'success',
            description: 'DB task completed',
            lesson: 'Use indexes for performance',
            tags: ['database'],
            utilityScore: 0.8
          }
        ]);

        expect(lessons.length).toBeGreaterThan(0);
        expect(lessons[0].tags).toContain('auth');
      });
    });
  });

  describe('EvolveAgent', () => {
    let evolveAgent: EvolveAgent;

    beforeEach(() => {
      evolveAgent = new EvolveAgent(okfGenerator);
    });

    describe('selectSkill', () => {
      it('should select a skill based on task context', () => {
        const skill = evolveAgent.selectSkill('implement authentication');

        expect(skill).toBeDefined();
        expect(skill.name).toBeDefined();
      });

      it('should return default skill when pool is empty', () => {
        const skill = evolveAgent.selectSkill('any task');

        expect(skill.name).toBe('default');
      });
    });

    describe('reflectAndEvolve', () => {
      it('should generate new rules when pool underperforms', async () => {
        const newRules = await evolveAgent.reflectAndEvolve({
          failureRate: 0.5,
          averageReward: 0.2,
          stuckDetections: 0
        });

        expect(newRules.length).toBeGreaterThan(0);
        expect(newRules[0].name).toContain('auto-rule');
      });

      it('should not generate rules when pool performs well', async () => {
        const newRules = await evolveAgent.reflectAndEvolve({
          failureRate: 0.1,
          averageReward: 0.8,
          stuckDetections: 0
        });

        expect(newRules.length).toBe(0);
      });

      it('should generate targeted rules for high failure rates', async () => {
        const newRules = await evolveAgent.reflectAndEvolve({
          failureRate: 0.6,
          averageReward: 0.2,
          stuckDetections: 0
        });

        expect(newRules.length).toBeGreaterThan(0);
        expect(newRules[0].condition).toContain('failure_rate > 0.5');
      });

      it('should create fix rules when consecutive failures detected', async () => {
        // Generate multiple underperforming rules to trigger consecutive failure detection
        for (let i = 0; i < 5; i++) {
          await evolveAgent.reflectAndEvolve({
            failureRate: 0.8,
            averageReward: 0.1,
            stuckDetections: 0
          });
        }

        const stats = evolveAgent.getPoolStats();
        expect(stats.totalRules).toBeGreaterThan(0);
      });
    });

    describe('getPoolStats', () => {
      it('should return pool statistics', () => {
        const stats = evolveAgent.getPoolStats();

        expect(stats).toBeDefined();
        expect(stats.totalRules).toBe(0);
        expect(stats.averageQuality).toBe(0);
        expect(stats.underperforming).toBe(0);
      });
    });
  });

  describe('LearnAgent', () => {
    let learnAgent: LearnAgent;

    beforeEach(() => {
      learnAgent = new LearnAgent(okfGenerator);
    });

    describe('selfQuestion', () => {
      it('should generate curiosity-driven task', async () => {
        const task = await learnAgent.selfQuestion('current-environment');

        expect(task).toBeDefined();
        expect(typeof task).toBe('string');
        expect(task.length).toBeGreaterThan(0);
      });

      it('should return test-related task for test failure context', async () => {
        const task = await learnAgent.selfQuestion('test failure in unit tests');

        expect(task).toContain('test failure');
      });

      it('should return performance task for slow context', async () => {
        const task = await learnAgent.selfQuestion('performance is slow');

        expect(task).toContain('Profile');
      });

      it('should return error task for error context', async () => {
        const task = await learnAgent.selfQuestion('error handling missing');

        expect(task).toContain('error');
      });
    });

    describe('selfNavigate', () => {
      it('should select best principle', async () => {
        const principle = await learnAgent.selfNavigate([
          {
            id: '1',
            principle: 'Principle A',
            context: 'context A',
            effectiveness: 0.9,
            usageCount: 10,
            lastUsed: new Date().toISOString()
          },
          {
            id: '2',
            principle: 'Principle B',
            context: 'context B',
            effectiveness: 0.5,
            usageCount: 5,
            lastUsed: new Date().toISOString()
          }
        ]);

        expect(principle).toBe('Principle A');
      });

      it('should return default when no experience', async () => {
        const principle = await learnAgent.selfNavigate([]);

        expect(principle).toContain('No experience available');
      });
    });

    describe('selfAttribute', () => {
      it('should calculate reward based on contribution', async () => {
        const reward = await learnAgent.selfAttribute({
          steps: ['step1', 'step2'],
          outcome: 'success',
          contribution: 0.8
        });

        expect(reward).toBe(0.8); // 1.0 * 0.8
      });

      it('should penalize failures', async () => {
        const reward = await learnAgent.selfAttribute({
          steps: ['step1'],
          outcome: 'failure',
          contribution: 0.8
        });

        expect(reward).toBe(0); // 0.0 * 0.8
      });
    });

    describe('learn', () => {
      it('should learn from experience and store principle', async () => {
        const principle = await learnAgent.learn({
          taskId: 'test-task',
          steps: ['step1', 'step2'],
          outcome: 'success'
        });

        expect(principle).toBeDefined();
        expect(principle.principle).toContain('test-task');
        expect(principle.effectiveness).toBe(0.8);
      });
    });

    describe('getPoolStats', () => {
      it('should return principle pool statistics', () => {
        const stats = learnAgent.getPoolStats();

        expect(stats).toBeDefined();
        expect(stats.totalPrinciples).toBe(0);
        expect(stats.averageEffectiveness).toBe(0);
        expect(stats.mostEffective).toBeNull();
      });
    });
  });

  describe('SelfImprovementOrchestrator', () => {
    describe('improve', () => {
      it('should run full improvement cycle', async () => {
        const result = await orchestrator.improve({
          taskId: 'integration-test',
          steps: ['analyze', 'implement', 'test'],
          outcome: 'success',
          telemetryMetrics: {
            failureRate: 0.1,
            averageReward: 0.8,
            stuckDetections: 0
          }
        });

        expect(result).toBeDefined();
        expect(result.retroFeedback).toBeDefined();
        expect(result.principle).toBeDefined();
        expect(result.newRules).toBeDefined();
      });

      it('should learn from failures', async () => {
        const result = await orchestrator.improve({
          taskId: 'failed-task',
          steps: ['analyze', 'implement'],
          outcome: 'failure',
          error: 'Test failed'
        });

        expect(result.retroFeedback.successPrediction).toBe('failure');
        expect(result.principle.effectiveness).toBe(0.2);
      });
    });

    describe('getStats', () => {
      it('should return comprehensive stats', () => {
        const stats = orchestrator.getStats();

        expect(stats).toBeDefined();
        expect(stats.retro).toBeDefined();
        expect(stats.evolve).toBeDefined();
        expect(stats.learn).toBeDefined();
      });
    });
  });
});
