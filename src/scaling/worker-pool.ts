// Vibemate Worker Thread Module
// Provides worker thread pool for CPU-bound tasks

import { Worker } from 'worker_threads';

export interface WorkerConfig {
  minWorkers: number;
  maxWorkers: number;
  idleTimeoutMs: number;
  taskTimeoutMs: number;
}

export interface WorkerInfo {
  id: string;
  worker: Worker;
  busy: boolean;
  tasksCompleted: number;
  lastActive: number;
  activeReject?: (err: Error) => void;
  activeTimeout?: ReturnType<typeof setTimeout>;
}

export interface WorkerTask<T, R> {
  id: string;
  data: T;
  resolve: (result: R) => void;
  reject: (err: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

export class WorkerPool {
  private config: WorkerConfig;
  private workers: Map<string, WorkerInfo> = new Map();
  private taskQueue: WorkerTask<unknown, unknown>[] = [];
  private taskIdCounter = 0;

  constructor(config?: Partial<WorkerConfig>) {
    this.config = {
      minWorkers: 2,
      maxWorkers: 8,
      idleTimeoutMs: 30000,
      taskTimeoutMs: 60000,
      ...config,
    };
  }

  async initialize(scriptPath: string): Promise<void> {
    for (let i = 0; i < this.config.minWorkers; i++) {
      await this.createWorker(scriptPath);
    }
  }

  private async createWorker(scriptPath: string): Promise<WorkerInfo> {
    const id = `worker-${this.workers.size}`;
    const worker = new Worker(scriptPath);

    const info: WorkerInfo = {
      id,
      worker,
      busy: false,
      tasksCompleted: 0,
      lastActive: Date.now(),
    };

    worker.on('message', (result) => {
      this.handleWorkerMessage(info, result);
    });

    worker.on('error', (err) => {
      this.handleWorkerError(info, err);
    });

    worker.on('exit', () => {
      this.handleWorkerExit(info);
    });

    this.workers.set(id, info);
    return info;
  }

  private handleWorkerMessage(worker: WorkerInfo, _result: unknown): void {
    worker.busy = false;
    worker.tasksCompleted++;
    worker.lastActive = Date.now();

    this.processQueue();
  }

  private handleWorkerError(worker: WorkerInfo, err: Error): void {
    if (worker.activeTimeout) {
      clearTimeout(worker.activeTimeout);
      worker.activeTimeout = undefined;
    }
    if (worker.activeReject) {
      worker.activeReject(err);
      worker.activeReject = undefined;
    }
    worker.busy = false;
    console.error(`Worker ${worker.id} error:`, err);
    this.processQueue();
  }

  private handleWorkerExit(worker: WorkerInfo): void {
    this.workers.delete(worker.id);
  }

  async execute<T, R>(scriptPath: string, data: T): Promise<R> {
    const id = `task-${this.taskIdCounter++}`;

    let worker = Array.from(this.workers.values()).find(w => !w.busy);

    if (!worker && this.workers.size < this.config.maxWorkers) {
      worker = await this.createWorker(scriptPath);
    }

    if (!worker) {
      return new Promise<R>((resolve, reject) => {
        const timeout = setTimeout(() => {
          const idx = this.taskQueue.findIndex(t => t.id === id);
          if (idx !== -1) this.taskQueue.splice(idx, 1);
          reject(new Error(`Task ${id} timeout`));
        }, this.config.taskTimeoutMs);
        this.taskQueue.push({ id, data, resolve: resolve as (result: unknown) => void, reject, timeout });
      });
    }

    worker.busy = true;
    worker.lastActive = Date.now();

    return new Promise<R>((resolve, reject) => {
      worker!.activeReject = reject;
      const timeout = setTimeout(() => {
        worker!.activeReject = undefined;
        worker!.activeTimeout = undefined;
        worker!.worker.removeListener('message', messageHandler);
        worker!.busy = false;
        reject(new Error(`Task ${id} timeout`));
      }, this.config.taskTimeoutMs);
      worker!.activeTimeout = timeout;

      const messageHandler = (result: R) => {
        worker!.activeReject = undefined;
        worker!.activeTimeout = undefined;
        worker!.worker.removeListener('message', messageHandler);
        clearTimeout(timeout);
        worker!.busy = false;
        resolve(result);
      };

      worker!.worker.once('message', messageHandler);
      worker!.worker.postMessage(data);
    });
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    const worker = Array.from(this.workers.values()).find(w => !w.busy);
    if (!worker) return;

    const task = this.taskQueue.shift()!;
    worker.busy = true;
    worker.lastActive = Date.now();

    const messageHandler = (result: unknown) => {
      worker!.worker.removeListener('message', messageHandler);
      clearTimeout(task.timeout);
      worker!.busy = false;
      task.resolve(result);
    };

    worker.worker.once('message', messageHandler);
    worker.worker.postMessage(task.data);
  }

  async terminate(timeoutMs: number = 5000): Promise<void> {
    for (const task of this.taskQueue) {
      clearTimeout(task.timeout);
      task.reject(new Error('Pool terminated'));
    }
    this.taskQueue = [];

    const terminations = Array.from(this.workers.values()).map((info) =>
      Promise.race([
        info.worker.terminate(),
        new Promise<void>((resolve) => setTimeout(() => {
          try { info.worker.terminate(); } catch (error) {
            console.error(`[WorkerPool] Worker ${info.id} already terminated: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
          resolve();
        }, timeoutMs)),
      ])
    );
    await Promise.allSettled(terminations);
    this.workers.clear();
  }

  getStats(): {
    totalWorkers: number;
    busyWorkers: number;
    idleWorkers: number;
    queueSize: number;
    totalTasksCompleted: number;
  } {
    const workers = Array.from(this.workers.values());
    return {
      totalWorkers: workers.length,
      busyWorkers: workers.filter(w => w.busy).length,
      idleWorkers: workers.filter(w => !w.busy).length,
      queueSize: this.taskQueue.length,
      totalTasksCompleted: workers.reduce((sum, w) => sum + w.tasksCompleted, 0),
    };
  }
}
