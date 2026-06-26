import { describe, it, expect, beforeEach } from 'vitest';
import { AutoScaler } from '../../src/scaling/auto-scaler';

describe('AutoScaler', () => {
  let scaler: AutoScaler;

  beforeEach(() => {
    scaler = new AutoScaler({
      minWorkers: 2,
      maxWorkers: 10,
      scaleUpThreshold: 70,
      scaleDownThreshold: 30,
      cooldownMs: 0, // Disable cooldown for testing
    });
  });

  it('should initialize with default config', () => {
    expect(scaler.getWorkerCount()).toBe(0);
  });

  it('should add workers', () => {
    scaler.addWorker('worker-1');
    scaler.addWorker('worker-2');
    expect(scaler.getWorkerCount()).toBe(2);
  });

  it('should remove workers', () => {
    scaler.addWorker('worker-1');
    scaler.addWorker('worker-2');
    scaler.removeWorker('worker-1');
    expect(scaler.getWorkerCount()).toBe(1);
  });

  it('should update worker metrics', () => {
    scaler.addWorker('worker-1');
    scaler.updateMetrics('worker-1', { cpu: 50, memory: 60 });
    const workers = scaler.getWorkers();
    expect(workers[0].cpu).toBe(50);
    expect(workers[0].memory).toBe(60);
  });

  it('should calculate average CPU', () => {
    scaler.addWorker('worker-1');
    scaler.addWorker('worker-2');
    scaler.updateMetrics('worker-1', { cpu: 60 });
    scaler.updateMetrics('worker-2', { cpu: 80 });
    expect(scaler.getAverageCpu()).toBe(70);
  });

  it('should calculate average memory', () => {
    scaler.addWorker('worker-1');
    scaler.addWorker('worker-2');
    scaler.updateMetrics('worker-1', { memory: 40 });
    scaler.updateMetrics('worker-2', { memory: 60 });
    expect(scaler.getAverageMemory()).toBe(50);
  });

  it('should make scale up decision when CPU is high', () => {
    scaler.addWorker('worker-1');
    scaler.updateMetrics('worker-1', { cpu: 80 });
    const decision = scaler.makeDecision();
    expect(decision.action).toBe('scale_up');
    expect(decision.targetWorkers).toBe(2);
  });

  it('should make scale down decision when CPU is low', () => {
    scaler.addWorker('worker-1');
    scaler.addWorker('worker-2');
    scaler.addWorker('worker-3');
    scaler.updateMetrics('worker-1', { cpu: 20 });
    scaler.updateMetrics('worker-2', { cpu: 20 });
    scaler.updateMetrics('worker-3', { cpu: 20 });
    const decision = scaler.makeDecision();
    expect(decision.action).toBe('scale_down');
    expect(decision.targetWorkers).toBe(2);
  });

  it('should maintain when within thresholds', () => {
    scaler.addWorker('worker-1');
    scaler.addWorker('worker-2');
    scaler.updateMetrics('worker-1', { cpu: 50 });
    scaler.updateMetrics('worker-2', { cpu: 50 });
    const decision = scaler.makeDecision();
    expect(decision.action).toBe('maintain');
  });

  it('should respect max workers limit', () => {
    for (let i = 0; i < 10; i++) {
      scaler.addWorker(`worker-${i}`);
    }
    scaler.updateMetrics('worker-0', { cpu: 90 });
    const decision = scaler.makeDecision();
    expect(decision.targetWorkers).toBeLessThanOrEqual(10);
  });

  it('should respect min workers limit', () => {
    scaler.addWorker('worker-1');
    scaler.addWorker('worker-2');
    scaler.updateMetrics('worker-1', { cpu: 10 });
    scaler.updateMetrics('worker-2', { cpu: 10 });
    const decision = scaler.makeDecision();
    expect(decision.targetWorkers).toBeGreaterThanOrEqual(2);
  });

  it('should track scaling history', () => {
    scaler.addWorker('worker-1');
    scaler.updateMetrics('worker-1', { cpu: 80 });
    scaler.makeDecision();
    scaler.updateMetrics('worker-1', { cpu: 20 });
    scaler.makeDecision();
    expect(scaler.getHistory()).toHaveLength(2);
  });
});
