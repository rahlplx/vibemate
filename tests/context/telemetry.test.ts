// Telemetry: Usage Diagnostics for Context Engine
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ContextEngine } from '../../src/context/engine.js';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Context Engine Telemetry', () => {
  let testDir: string;
  let engine: ContextEngine;

  beforeEach(async () => {
    testDir = join(tmpdir(), `telemetry-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    engine = new ContextEngine(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Assembly Metrics', () => {
    it('should track total assemblies', async () => {
      const stats1 = engine.getStats();
      expect(stats1.totalAssemblies).toBe(0);

      await engine.assemble('test', {});
      const stats2 = engine.getStats();
      expect(stats2.totalAssemblies).toBe(1);

      await engine.assemble('test', {});
      const stats3 = engine.getStats();
      expect(stats3.totalAssemblies).toBe(2);
    });

    it('should track average token count', async () => {
      await engine.assemble('test', {});
      const stats = engine.getStats();
      
      expect(stats.avgTokenCount).toBeGreaterThan(0);
    });

    it('should track cache hit rate', async () => {
      // First call - cache miss
      await engine.assemble('test', {});
      const stats1 = engine.getStats();
      expect(stats1.cacheHitRate).toBe(0);

      // Second call - cache hit (same tool name)
      await engine.assemble('test', {});
      const stats2 = engine.getStats();
      expect(stats2.cacheHitRate).toBeGreaterThan(0);
    });
  });

  describe('Performance Metrics', () => {
    it('should complete assembly within time limit', async () => {
      const start = Date.now();
      await engine.assemble('test', {});
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(5000); // Should complete in <5s
    });

    it('should handle multiple assemblies efficiently', async () => {
      const start = Date.now();
      
      for (let i = 0; i < 10; i++) {
        await engine.assemble('test', { iteration: i });
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(10000); // 10 assemblies in <10s
    });
  });

  describe('Token Efficiency', () => {
    it('should stay within token budget', async () => {
      const context = await engine.assemble('test', {});
      
      expect(context.tokenCount).toBeLessThanOrEqual(80000);
    });

    it('should provide budget breakdown', async () => {
      const context = await engine.assemble('test', {});
      
      expect(context.budget.system).toBeGreaterThan(0);
      expect(context.budget.repoMap).toBeGreaterThan(0);
      expect(context.budget.files).toBeGreaterThan(0);
      expect(context.budget.history).toBeGreaterThan(0);
      expect(context.budget.tool).toBeGreaterThan(0);
    });
  });

  describe('Skill Activation Metrics', () => {
    it('should track activated skills', async () => {
      const context = await engine.assemble('fix login bug', {});
      
      expect(context.skills).toBeDefined();
      expect(Array.isArray(context.skills)).toBe(true);
    });

    it('should not activate irrelevant skills', async () => {
      const context = await engine.assemble('fix login bug', {});
      
      expect(context.skills).not.toContain('remotion');
      expect(context.skills).not.toContain('stitch');
    });
  });

  describe('Diagnostics Output', () => {
    it('should provide comprehensive diagnostics', async () => {
      await engine.assemble('test', {});
      
      const stats = engine.getStats();
      
      expect(stats).toHaveProperty('totalAssemblies');
      expect(stats).toHaveProperty('cacheHitRate');
      expect(stats).toHaveProperty('avgTokenCount');
      
      expect(typeof stats.totalAssemblies).toBe('number');
      expect(typeof stats.cacheHitRate).toBe('number');
      expect(typeof stats.avgTokenCount).toBe('number');
    });
  });
});
