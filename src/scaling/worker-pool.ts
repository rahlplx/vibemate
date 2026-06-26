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
  private taskQueue: WorkerTask<any, any>[] = [];
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

  private handleWorkerMessage(worker: WorkerInfo, _result: any): void {
    worker.busy = false;
    worker.tasksCompleted++;
    worker.lastActive = Date.now();

    // Process next task from queue
    this.processQueue();
  }

  private handleWorkerError(worker: WorkerInfo, err: Error): void {
    worker.busy = false;
    console.error(`Worker ${worker.id} error:`, err);
  }

  private handleWorkerExit(worker: WorkerInfo): void {
    this.workers.delete(worker.id);
    // Replace with new worker if below minimum
    if (this.workers.size < this.config.minWorkers) {
      // async createWorker() - simplified for now
    }
  }

  async execute<T, R>(scriptPath: string, data: T): Promise<R> {
    return new Promise(async (resolve, reject) => {
      const id = `task-${this.taskIdCounter++}`;

      const timeout = setTimeout(() => {
        reject(new Error(`Task ${id} timeout`));
      }, this.config.taskTimeoutMs);

      // Find available worker
      const worker = Array.from(this.workers.values()).find(w => !w.busy);

      if (worker) {
        worker.busy = true;
        worker.lastActive = Date.now();

        const messageHandler = (result: R) => {
          worker!.worker.removeListener('message', messageHandler);
          clearTimeout(timeout);
          resolve(result);
        };

        worker.worker.once('message', messageHandler);
        worker.worker.postMessage(data);
      } else if (this.workers.size < this.config.maxWorkers) {
        // Create new worker
        const newWorker = await this.createWorker(scriptPath);
        newWorker.busy = true;
        newWorker.lastActive = Date.now();

        const messageHandler = (result: R) => {
          newWorker.worker.removeListener('message', messageHandler);
          clearTimeout(timeout);
          resolve(result);
        };

        newWorker.worker.once('message', messageHandler);
        newWorker.worker.postMessage(data);
      } else {
        // Queue the task
        this.taskQueue.push({ id, data, resolve, reject, timeout });
      }
    });
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    const worker = Array.from(this.workers.values()).find(w => !w.busy);
    if (!worker) return;

    const task = this.taskQueue.shift()!;
    worker.busy = true;
    worker.lastActive = Date.now();

    const messageHandler = (result: any) => {
      worker!.worker.removeListener('message', messageHandler);
      clearTimeout(task.timeout);
      task.resolve(result);
    };

    worker.worker.once('message', messageHandler);
    worker.worker.postMessage(task.data);
  }

  async terminate(): Promise<void> {
    // Clear queue
    for (const task of this.taskQueue) {
      clearTimeout(task.timeout);
      task.reject(new Error('Pool terminated'));
    }
    this.taskQueue = [];

    // Terminate all workers
    for (const info of this.workers.values()) {
      await info.worker.terminate();
    }
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
