import { describe, it, expect } from 'bun:test';
import { getTemplateNames, getTemplate, renderTemplate } from './templates.js';

describe('getTemplateNames', () => {
  it('returns all template names', () => {
    const names = getTemplateNames();
    expect(names).toContain('default');
    expect(names).toContain('api');
    expect(names).toContain('cli');
    expect(names).toContain('auth');
  });
});

describe('getTemplate', () => {
  it('returns default template', () => {
    const t = getTemplate('default');
    expect(t).toBeDefined();
    expect(t?.name).toBe('default');
    expect(t?.files.length).toBeGreaterThan(0);
  });

  it('returns api template', () => {
    const t = getTemplate('api');
    expect(t).toBeDefined();
    expect(t?.name).toBe('api');
  });

  it('returns cli template', () => {
    const t = getTemplate('cli');
    expect(t).toBeDefined();
    expect(t?.name).toBe('cli');
  });

  it('returns auth template', () => {
    const t = getTemplate('auth');
    expect(t).toBeDefined();
    expect(t?.name).toBe('auth');
    expect(t?.files.length).toBeGreaterThanOrEqual(5);
  });

  it('returns undefined for unknown template', () => {
    const t = getTemplate('nonexistent');
    expect(t).toBeUndefined();
  });
});

describe('auth template', () => {
  it('has signup, login, middleware, rate-limit, index, and migration files', () => {
    const t = getTemplate('auth')!;
    const paths = t.files.map((f) => f.path);
    expect(paths).toContain('src/auth/signup.ts');
    expect(paths).toContain('src/auth/login.ts');
    expect(paths).toContain('src/auth/middleware.ts');
    expect(paths).toContain('src/auth/rate-limit.ts');
    expect(paths).toContain('src/auth/index.ts');
    expect(paths).toContain('migrations/001_create_users.sql');
  });

  it('signup uses bcryptjs and jsonwebtoken', () => {
    const t = getTemplate('auth')!;
    const signup = t.files.find((f) => f.path === 'src/auth/signup.ts')!;
    expect(signup.content).toContain('bcryptjs');
    expect(signup.content).toContain('jsonwebtoken');
  });

  it('middleware implements JWT verification', () => {
    const t = getTemplate('auth')!;
    const middleware = t.files.find((f) => f.path === 'src/auth/middleware.ts')!;
    expect(middleware.content).toContain('verify');
    expect(middleware.content).toContain('requireRole');
  });

  it('rate-limit tracks attempts', () => {
    const t = getTemplate('auth')!;
    const rl = t.files.find((f) => f.path === 'src/auth/rate-limit.ts')!;
    expect(rl.content).toContain('checkRateLimit');
    expect(rl.content).toContain('maxAttempts');
  });

  it('migration creates users table', () => {
    const t = getTemplate('auth')!;
    const migration = t.files.find((f) => f.path === 'migrations/001_create_users.sql')!;
    expect(migration.content).toContain('CREATE TABLE');
    expect(migration.content).toContain('users');
    expect(migration.content).toContain('email');
    expect(migration.content).toContain('password');
    expect(migration.content).toContain('role');
  });
});

describe('renderTemplate', () => {
  it('replaces variables in file paths', () => {
    const t = getTemplate('default')!;
    const files = renderTemplate(t, { projectName: 'my-app', description: 'Test app' });
    expect(files[0].path).toBe('package.json');
    expect(files[2].path).toBe('src/index.ts');
  });

  it('replaces variables in file content', () => {
    const t = getTemplate('default')!;
    const files = renderTemplate(t, { projectName: 'my-app', description: 'Test app' });
    expect(files[0].content).toContain('my-app');
    expect(files[0].content).toContain('Test app');
    expect(files[2].content).toContain('my-app');
  });

  it('renders auth template with variables', () => {
    const t = getTemplate('auth')!;
    const files = renderTemplate(t, { projectName: 'my-api', description: 'Auth API' });
    const signup = files.find((f) => f.path === 'src/auth/signup.ts')!;
    expect(signup).toBeDefined();
    expect(signup.content).toContain('bcryptjs');
  });

  it('sanitizes path segments', () => {
    const t = getTemplate('default')!;
    const files = renderTemplate(t, { projectName: '../../etc/passwd', description: 'Test' });
    expect(files[0].path).not.toContain('..');
  });
});
