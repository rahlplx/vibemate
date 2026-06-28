import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createDiscoveryEngine } from '../discovery/index.js';
import { createDecisionEngine } from '../decision/index.js';
import { createScaffoldGenerator } from '../scaffold/generator.js';
import { getTemplateNames } from '../scaffold/templates.js';
import { calculateComplexity, determineExecutionMode } from '../execution/gate.js';
import { createConnection } from '../state/connection.js';
import { runMigrations } from '../state/migrations.js';
import { createStore } from '../state/store.js';
import { CostAwareRouter } from '../router/index.js';
import { LRUCache } from '../performance/cache.js';
import { TelemetryCollector } from '../telemetry/collector.js';
import { GovernanceEngine } from '../governance/engine.js';
import * as path from 'path';
import * as fs from 'fs';

const app = new Hono();

app.use('*', cors());

const RATE_LIMIT_MAX_ENTRIES = 10_000;
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function evictExpiredRateLimitEntries(now: number): void {
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) rateLimitStore.delete(ip);
  }
}

function rateLimiter(windowMs: number = 15 * 60 * 1000, max: number = 100) {
  return async (c: { req: { header: (name: string) => string | undefined }; json: (data: unknown, status?: number) => Response }, next: () => Promise<void>) => {
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetTime) {
      if (rateLimitStore.size >= RATE_LIMIT_MAX_ENTRIES) {
        evictExpiredRateLimitEntries(now);
      }
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= max) {
      return c.json({ error: 'Too many requests, please try again later.' }, 429);
    }

    record.count++;
    return next();
  };
}

app.use('*', rateLimiter());

const rateLimitCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(ip);
    }
  }
}, 5 * 60 * 1000);

export { rateLimitCleanupInterval };

const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, '.vibe', 'state.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const conn = createConnection(DB_PATH);
runMigrations(conn);
const store = createStore(conn);

const discovery = createDiscoveryEngine(DB_PATH);
const decision = createDecisionEngine(DB_PATH);
const router = new CostAwareRouter([], 100);
const cache = new LRUCache({ maxSize: 500, defaultTTL: 300_000 });
const telemetry = new TelemetryCollector({ enabled: true, serviceName: 'vibemate', serviceVersion: '1.0.0', exportDir: path.join(ROOT, '.vibe', 'telemetry') });
const governance = new GovernanceEngine({ persistPath: path.join(ROOT, '.vibe', 'governance.json') });

app.get('/api/health', (c) => c.json({ status: 'ok', version: '1.0.0', uptime: process.uptime() }));

app.get('/api/projects', (c) => c.json(store.listProjects()));

app.post('/api/projects', async (c) => {
  const body = await c.req.json();
  return c.json(store.createProject(body), 201);
});

app.get('/api/projects/:id', (c) => {
  const p = store.getProject(c.req.param('id'));
  return p ? c.json(p) : c.json({ error: 'Not found' }, 404);
});

app.post('/api/discovery/start', async (c) => {
  const { projectId, type } = await c.req.json();
  return c.json(discovery.startSession(projectId || 'default', type));
});

app.post('/api/discovery/answer', async (c) => {
  const { sessionId, questionId, answer } = await c.req.json();
  return c.json(discovery.answerQuestion(sessionId, questionId, answer));
});

app.get('/api/discovery/progress/:sessionId', (c) => {
  return c.json(discovery.getProgress(c.req.param('sessionId')));
});

app.get('/api/decision/categories', (c) => c.json(['databases', 'runtimes', 'frameworks', 'hosting']));

app.get('/api/decision/options/:category', (c) => {
  return c.json(decision.getOptions(c.req.param('category')));
});

app.post('/api/decision/compare', async (c) => {
  const { category, optionIds } = await c.req.json();
  return c.json(decision.createComparison(category, optionIds));
});

app.get('/api/decision/recommend/:category', (c) => {
  const category = c.req.param('category');
  const options = decision.getOptions(category);
  const optionIds = options.map(o => o.id);
  return c.json(decision.getRecommendation(category, optionIds));
});

app.get('/api/scaffold/templates', (c) => c.json(getTemplateNames()));

app.post('/api/scaffold/generate', async (c) => {
  const { template, variables, outputDir } = await c.req.json();
  const gen = createScaffoldGenerator();
  return c.json(gen.generate(outputDir, template, variables));
});

app.post('/api/execution/assess', async (c) => {
  const input = await c.req.json();
  const score = calculateComplexity({
    description: input.description || '',
    filesChanged: input.filesChanged || 1,
    linesChanged: input.linesChanged || 0,
    hasTests: input.hasTests || false,
    hasUI: input.hasUI || false,
  });
  return c.json({ score, mode: determineExecutionMode(score) });
});

app.get('/api/telemetry/metrics', (c) => c.json(telemetry.getMetrics()));

app.post('/api/telemetry/export', async (c) => {
  await telemetry.export();
  return c.json({ exported: true });
});

app.get('/api/governance/audit', (c) => {
  const log = governance.getAuditLog();
  const limit = parseInt(c.req.query('limit') || '50');
  return c.json(log.slice(-limit));
});

app.get('/api/governance/stats', (c) => {
  return c.json(governance.getAuditStats());
});

app.get('/api/cache/stats', (c) => c.json(cache.getStats()));

app.delete('/api/cache', (c) => {
  cache.clear();
  return c.json({ cleared: true });
});

app.get('/api/router/budget', (c) => c.json(router.getBudgetStatus()));

app.post('/api/router/route', async (c) => {
  const input = await c.req.json();
  const score = router.calculateComplexity(input);
  const routeResult = router.route(input);
  return c.json({ score, ...routeResult });
});

app.get('/api/status', async (c) => {
  const statePath = path.join(ROOT, '.vibe', 'state.json');
  let state = {};
  try {
    const raw = await fs.promises.readFile(statePath, 'utf-8');
    state = JSON.parse(raw);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  return c.json({
    state,
    modules: {
      discovery: true, decision: true, scaffold: true, execution: true,
      telemetry: true, governance: true,
      cache: cache.getStats(),
      router: router.getBudgetStatus(),
    },
  });
});

// SSE endpoint — pushes telemetry_span events and pipeline_state events
app.get('/events', (_c) => {
  const statePath = path.join(ROOT, '.vibe', 'state.json');
  let stateInterval: ReturnType<typeof setInterval> | undefined;
  let unsubscribe: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const enc = new TextEncoder();

      unsubscribe = telemetry.subscribe((span) => {
        try {
          controller.enqueue(enc.encode(`event: telemetry_span\ndata: ${JSON.stringify(span)}\n\n`));
        } catch {
          unsubscribe?.();
        }
      });

      stateInterval = setInterval(async () => {
        try {
          const raw = await fs.promises.readFile(statePath, 'utf-8');
          try {
            controller.enqueue(enc.encode(`event: pipeline_state\ndata: ${raw.trim()}\n\n`));
          } catch {
            if (stateInterval) clearInterval(stateInterval);
            unsubscribe?.();
          }
        } catch { /* no state file yet — skip */ }
      }, 1000);
    },
    cancel() {
      unsubscribe?.();
      if (stateInterval) clearInterval(stateInterval);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

// Vibemate Doctor — parallel health check across all subsystems
app.get('/api/doctor', async (c) => {
  const statePath = path.join(ROOT, '.vibe', 'state.json');

  const checks = await Promise.allSettled([
    Promise.resolve().then(() => ({
      name: 'database',
      ok: store.listProjects() !== undefined,
      detail: 'SQLite WAL connected',
    })),
    Promise.resolve().then(() => {
      const m = telemetry.getMetrics();
      return { name: 'telemetry', ok: true, detail: `cost $${m.totalCost.toFixed(4)}, ${m.errorRate === 0 ? 'no errors' : `err rate ${(m.errorRate * 100).toFixed(1)}%`}` };
    }),
    Promise.resolve().then(() => {
      const log = governance.getAuditLog();
      return { name: 'governance', ok: true, detail: `${log.length} audit entries` };
    }),
    Promise.resolve().then(() => {
      const s = cache.getStats();
      return { name: 'cache', ok: true, detail: `${s.size} entries, ${(s.hitRate * 100).toFixed(1)}% hit rate` };
    }),
    Promise.resolve().then(() => {
      const b = router.getBudgetStatus();
      const remaining = typeof b.remaining === 'number' ? `$${b.remaining.toFixed(2)} remaining` : 'budget ok';
      return { name: 'router', ok: true, detail: remaining };
    }),
    fs.promises.readFile(statePath, 'utf-8')
      .then(raw => {
        try {
          const parsed = JSON.parse(raw) as { phase?: string };
          return { name: 'pipeline', ok: true, detail: `phase: ${parsed.phase ?? 'unknown'}` };
        } catch (err) {
          return { name: 'pipeline', ok: false, detail: `Malformed state file: ${err instanceof Error ? err.message : String(err)}` };
        }
      })
      .catch((err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') return { name: 'pipeline', ok: true, detail: 'idle (no state file)' };
        return { name: 'pipeline', ok: false, detail: `Failed to read state file: ${err.message}` };
      }),
  ]);

  const checkNames = ['database', 'telemetry', 'governance', 'cache', 'router', 'pipeline'];
  const results = checks.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : { name: checkNames[i] ?? 'unknown', ok: false, detail: String((r as PromiseRejectedResult).reason) }
  );
  const allOk = results.every(r => r.ok);

  return c.json({ status: allOk ? 'healthy' : 'degraded', checks: results });
});

export { app };
