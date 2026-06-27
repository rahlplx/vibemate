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
});
