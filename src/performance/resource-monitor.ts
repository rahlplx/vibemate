import { PerformanceMonitor } from "./monitor";

export interface ResourceUsage {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  eventLoopLag: number;
  cpuUser: number;
  cpuSystem: number;
  timestamp: number;
}

export class ResourceMonitor {
  private perf: PerformanceMonitor;
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastLoopCheck: number = Date.now();
  private lastCpuUsage: { user: number, system: number } | null = null;

  constructor(perf: PerformanceMonitor) {
    this.perf = perf;
  }

  start(intervalMs: number = 100) {
    if (this.interval) return;
    this.lastCpuUsage = process.cpuUsage();
    this.lastLoopCheck = Date.now();

    this.interval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage(this.lastCpuUsage || undefined);
      this.lastCpuUsage = process.cpuUsage();

      const now = Date.now();
      const lag = now - this.lastLoopCheck - intervalMs;
      this.lastLoopCheck = now;

      this.perf.recordMetric("res.memory.rss", memUsage.rss);
      this.perf.recordMetric("res.memory.heapUsed", memUsage.heapUsed);
      this.perf.recordMetric("res.event_loop.lag", Math.max(0, lag));
      this.perf.recordMetric("res.cpu.user", cpuUsage.user);
      this.perf.recordMetric("res.cpu.system", cpuUsage.system);
    }, intervalMs);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}
