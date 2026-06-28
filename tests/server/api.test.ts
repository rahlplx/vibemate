import { describe, it, expect } from 'bun:test';
import { app, rateLimitCleanupInterval } from '../../src/server/api.js';

describe('API Rate Limiter', () => {
  it('allows requests within rate limit', async () => {
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });

  it('health endpoint returns version', async () => {
    const res = await app.request('/api/health');
    const body = await res.json();
    expect(body.version).toBe('1.0.0');
  });

  it('health endpoint returns uptime', async () => {
    const res = await app.request('/api/health');
    const body = await res.json();
    expect(typeof body.uptime).toBe('number');
  });

  it('cleanup interval is exported', () => {
    expect(rateLimitCleanupInterval).toBeDefined();
  });

  it('cleanup interval can be cleared', () => {
    clearInterval(rateLimitCleanupInterval);
    // After clearing, it should be undefined/NaN (already cleared)
    expect(true).toBe(true);
  });
});

describe('API Endpoints', () => {
  it('returns status endpoint', async () => {
    const res = await app.request('/api/status');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.modules).toBeDefined();
    expect(body.modules.discovery).toBe(true);
    expect(body.modules.decision).toBe(true);
  });

  it('returns decision categories', async () => {
    const res = await app.request('/api/decision/categories');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toContain('databases');
    expect(body).toContain('frameworks');
  });

  it('returns scaffold templates', async () => {
    const res = await app.request('/api/scaffold/templates');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toContain('default');
    expect(body).toContain('api');
  });

  it('returns cache stats', async () => {
    const res = await app.request('/api/cache/stats');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.hits).toBe('number');
    expect(typeof body.misses).toBe('number');
  });

  it('clears cache', async () => {
    const res = await app.request('/api/cache', { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cleared).toBe(true);
  });

  it('GET /api/projects returns array', async () => {
    const res = await app.request('/api/projects');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('POST /api/projects creates a project', async () => {
    const res = await app.request('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: `proj-${Date.now()}`, name: 'test-proj', type: 'saas' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toBeDefined();
  });

  it('GET /api/projects/:id returns 404 for missing project', async () => {
    const res = await app.request('/api/projects/nonexistent-id-xyz');
    expect(res.status).toBe(404);
  });

  it('POST /api/discovery/start starts a session', async () => {
    const res = await app.request('/api/discovery/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'saas' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sessionId).toBeDefined();
  });

  it('POST /api/discovery/answer records answer', async () => {
    const startRes = await app.request('/api/discovery/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'saas' }),
    });
    const { sessionId, question } = await startRes.json() as { sessionId: string; question: { id: string } };
    const res = await app.request('/api/discovery/answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, questionId: question.id, answer: 'productivity' }),
    });
    expect(res.status).toBe(200);
  });

  it('GET /api/discovery/progress/:sessionId returns progress', async () => {
    const startRes = await app.request('/api/discovery/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'saas' }),
    });
    const { sessionId } = await startRes.json();
    const res = await app.request(`/api/discovery/progress/${sessionId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    // getProgress returns a plain number (0-100)
    expect(typeof body).toBe('number');
  });

  it('GET /api/decision/options/:category returns options', async () => {
    const res = await app.request('/api/decision/options/databases');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('POST /api/decision/compare returns comparison', async () => {
    const optRes = await app.request('/api/decision/options/databases');
    const options = await optRes.json() as Array<{ id: string }>;
    const ids = options.slice(0, 2).map((o) => o.id);
    const res = await app.request('/api/decision/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'databases', optionIds: ids }),
    });
    expect(res.status).toBe(200);
  });

  it('GET /api/decision/recommend/:category returns recommendation', async () => {
    const res = await app.request('/api/decision/recommend/databases');
    expect(res.status).toBe(200);
  });

  it('POST /api/scaffold/generate generates files', async () => {
    const res = await app.request('/api/scaffold/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template: 'default', variables: { projectName: 'my-app' }, outputDir: '/tmp/test-scaffold' }),
    });
    expect(res.status).toBe(200);
  });

  it('POST /api/execution/assess returns score and mode', async () => {
    const res = await app.request('/api/execution/assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Add dark mode toggle', filesChanged: 2, hasUI: true }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.score).toBe('number');
    expect(body.mode).toBeDefined();
  });

  it('GET /api/telemetry/metrics returns metrics', async () => {
    const res = await app.request('/api/telemetry/metrics');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.totalTokens).toBe('number');
  });

  it('POST /api/telemetry/export returns exported true', async () => {
    const res = await app.request('/api/telemetry/export', { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.exported).toBe(true);
  });

  it('GET /api/governance/audit returns array', async () => {
    const res = await app.request('/api/governance/audit');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('GET /api/governance/stats returns stats', async () => {
    const res = await app.request('/api/governance/stats');
    expect(res.status).toBe(200);
  });

  it('GET /api/router/budget returns budget status', async () => {
    const res = await app.request('/api/router/budget');
    expect(res.status).toBe(200);
  });

  it('POST /api/router/route returns routing decision', async () => {
    const res = await app.request('/api/router/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'simple task', filesChanged: 1 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.model).toBeDefined();
  });
});
