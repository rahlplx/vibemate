// Vibemate Auto-Scaling Module
// Provides dynamic scaling based on metrics and rules

export interface ScalingConfig {
  minWorkers: number;
  maxWorkers: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownMs: number;
  metricsInterval: number;
}

export interface WorkerMetrics {
  id: string;
  cpu: number;
  memory: number;
  tasks: number;
  uptime: number;
  lastActive: number;
}

export interface ScalingDecision {
  action: 'scale_up' | 'scale_down' | 'maintain';
  reason: string;
  currentWorkers: number;
  targetWorkers: number;
  metrics: WorkerMetrics[];
}

export class AutoScaler {
  private config: ScalingConfig;
  private workers: Map<string, WorkerMetrics> = new Map();
  private lastScaleTime: number = 0;
  private scalingHistory: ScalingDecision[] = [];

  constructor(config?: Partial<ScalingConfig>) {
    this.config = {
      minWorkers: 2,
      maxWorkers: 10,
      scaleUpThreshold: 70,
      scaleDownThreshold: 30,
      cooldownMs: 60000,
      metricsInterval: 10000,
      ...config,
    };
  }

  addWorker(id: string): void {
    this.workers.set(id, {
      id,
      cpu: 0,
      memory: 0,
      tasks: 0,
      uptime: 0,
      lastActive: Date.now(),
    });
  }

  removeWorker(id: string): void {
    this.workers.delete(id);
  }

  updateMetrics(id: string, metrics: Partial<WorkerMetrics>): void {
    const worker = this.workers.get(id);
    if (worker) {
      if (metrics.cpu !== undefined) worker.cpu = metrics.cpu;
      if (metrics.memory !== undefined) worker.memory = metrics.memory;
      if (metrics.tasks !== undefined) worker.tasks = metrics.tasks;
      if (metrics.uptime !== undefined) worker.uptime = metrics.uptime;
      worker.lastActive = Date.now();
    }
  }

  getAverageCpu(): number {
    const workers = Array.from(this.workers.values());
    if (workers.length === 0) return 0;
    return workers.reduce((sum, w) => sum + w.cpu, 0) / workers.length;
  }

  getAverageMemory(): number {
    const workers = Array.from(this.workers.values());
    if (workers.length === 0) return 0;
    return workers.reduce((sum, w) => sum + w.memory, 0) / workers.length;
  }

  getTotalTasks(): number {
    return Array.from(this.workers.values()).reduce((sum, w) => sum + w.tasks, 0);
  }

  canScale(): boolean {
    return Date.now() - this.lastScaleTime >= this.config.cooldownMs;
  }

  makeDecision(): ScalingDecision {
    const avgCpu = this.getAverageCpu();
    const avgMemory = this.getAverageMemory();
    const currentWorkers = this.workers.size;

    let action: ScalingDecision['action'] = 'maintain';
    let reason = '';
    let targetWorkers = currentWorkers;

    if (!this.canScale()) {
      reason = 'Cooldown period active';
    } else if (avgCpu > this.config.scaleUpThreshold || avgMemory > this.config.scaleUpThreshold) {
      action = 'scale_up';
      reason = `High resource usage: CPU=${avgCpu.toFixed(1)}%, Memory=${avgMemory.toFixed(1)}%`;
      targetWorkers = Math.min(currentWorkers + 1, this.config.maxWorkers);
    } else if (avgCpu < this.config.scaleDownThreshold && avgMemory < this.config.scaleDownThreshold && currentWorkers > this.config.minWorkers) {
      action = 'scale_down';
      reason = `Low resource usage: CPU=${avgCpu.toFixed(1)}%, Memory=${avgMemory.toFixed(1)}%`;
      targetWorkers = Math.max(currentWorkers - 1, this.config.minWorkers);
    } else {
      reason = `Within thresholds: CPU=${avgCpu.toFixed(1)}%, Memory=${avgMemory.toFixed(1)}%`;
    }

    const decision: ScalingDecision = {
      action,
      reason,
      currentWorkers,
      targetWorkers,
      metrics: Array.from(this.workers.values()),
    };

    this.scalingHistory.push(decision);
    if (this.scalingHistory.length > 100) {
      this.scalingHistory = this.scalingHistory.slice(-100);
    }
    if (action !== 'maintain') {
      this.lastScaleTime = Date.now();
    }

    return decision;
  }

  getHistory(): ScalingDecision[] {
    return [...this.scalingHistory];
  }

  getWorkerCount(): number {
    return this.workers.size;
  }

  getWorkers(): WorkerMetrics[] {
    return Array.from(this.workers.values());
  }
}
