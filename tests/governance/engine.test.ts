import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { GovernanceEngine } from '../../src/governance/engine';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('GovernanceEngine', () => {
  let engine: GovernanceEngine;

  beforeEach(() => {
    engine = new GovernanceEngine();
  });

  it('should have default roles', () => {
    expect(engine.getRole('admin')).toBeDefined();
    expect(engine.getRole('developer')).toBeDefined();
    expect(engine.getRole('viewer')).toBeDefined();
  });

  it('should add custom roles', () => {
    engine.addRole({
      name: 'tester',
      permissions: ['read', 'execute'],
      description: 'Test access',
    });
    expect(engine.getRole('tester')).toBeDefined();
  });

  it('should add users', () => {
    engine.addUser({
      id: 'user-1',
      name: 'John Doe',
      roles: ['developer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });
    expect(engine.getUser('user-1')).toBeDefined();
  });

  it('should check permissions', () => {
    engine.addUser({
      id: 'user-1',
      name: 'John Doe',
      roles: ['developer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });
    expect(engine.hasPermission('user-1', 'read', 'discovery')).toBe(true);
    expect(engine.hasPermission('user-1', 'write', 'discovery')).toBe(true);
    expect(engine.hasPermission('user-1', 'admin', 'discovery')).toBe(false);
  });

  it('should deny permissions for viewers', () => {
    engine.addUser({
      id: 'user-1',
      name: 'John Doe',
      roles: ['viewer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });
    expect(engine.hasPermission('user-1', 'read', 'discovery')).toBe(true);
    expect(engine.hasPermission('user-1', 'write', 'discovery')).toBe(false);
  });

  it('should log audit entries', () => {
    engine.addUser({
      id: 'user-1',
      name: 'John Doe',
      roles: ['developer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });
    engine.hasPermission('user-1', 'read', 'discovery');
    engine.hasPermission('user-1', 'write', 'discovery');
    const log = engine.getAuditLog();
    expect(log).toHaveLength(2);
  });

  it('should filter audit log', () => {
    engine.addUser({
      id: 'user-1',
      name: 'John Doe',
      roles: ['developer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });
    engine.addUser({
      id: 'user-2',
      name: 'Jane Doe',
      roles: ['viewer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });
    engine.hasPermission('user-1', 'read', 'discovery');
    engine.hasPermission('user-2', 'read', 'discovery');
    const log = engine.getAuditLog({ userId: 'user-1' });
    expect(log).toHaveLength(1);
  });

  it('should return audit stats', () => {
    engine.addUser({
      id: 'user-1',
      name: 'John Doe',
      roles: ['developer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });
    engine.hasPermission('user-1', 'read', 'discovery');
    const stats = engine.getAuditStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.successful).toBe(1);
  });

  it('should remove users', () => {
    engine.addUser({
      id: 'user-1',
      name: 'John Doe',
      roles: ['developer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });
    expect(engine.removeUser('user-1')).toBe(true);
    expect(engine.getUser('user-1')).toBeUndefined();
  });

  it('should remove roles', () => {
    expect(engine.removeRole('viewer')).toBe(true);
    expect(engine.getRole('viewer')).toBeUndefined();
  });

  it('should use UUID for audit entry IDs', () => {
    engine.addUser({
      id: 'user-1',
      name: 'John Doe',
      roles: ['developer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });
    engine.hasPermission('user-1', 'read', 'discovery');
    const log = engine.getAuditLog();
    expect(log[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('addPolicy overrides role-based permission check', () => {
    engine.addUser({
      id: 'user-1',
      name: 'Alice',
      roles: ['developer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });
    engine.addPolicy({
      name: 'deny-execute',
      description: 'Block execute for everyone',
      action: 'deny',
      condition: (ctx) => ctx.action === 'execute',
    });
    // developer normally can execute, but the deny policy overrides it
    expect(engine.hasPermission('user-1', 'execute', 'ci')).toBe(false);
  });

  it('addPolicy with allow action short-circuits role check', () => {
    engine.addUser({
      id: 'user-1',
      name: 'Alice',
      roles: ['viewer'],   // viewer can only read
      createdAt: new Date(),
      lastActive: new Date(),
    });
    engine.addPolicy({
      name: 'allow-write',
      description: 'Allow write for everyone',
      action: 'allow',
      condition: () => true,
    });
    expect(engine.hasPermission('user-1', 'write', 'discovery')).toBe(true);
  });

  it('trims audit log when exceeding maxAuditEntries', () => {
    const smallEngine = new GovernanceEngine({ maxAuditEntries: 5 });
    smallEngine.addUser({ id: 'u', name: 'u', roles: ['developer'], createdAt: new Date(), lastActive: new Date() });
    for (let i = 0; i < 8; i++) {
      smallEngine.hasPermission('u', 'read', `res-${i}`);
    }
    const log = smallEngine.getAuditLog();
    // After trim: keeps last 80% of 5 = 4 entries
    expect(log.length).toBeLessThanOrEqual(5);
  });
});

describe('GovernanceEngine Persistence', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `governance-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(testDir)) {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('should persist and load audit log', async () => {
    const engine = new GovernanceEngine({ persistPath: testDir });
    engine.addUser({
      id: 'user-1',
      name: 'John Doe',
      roles: ['developer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });
    engine.hasPermission('user-1', 'read', 'discovery');

    await engine.persist();

    const engine2 = new GovernanceEngine({ persistPath: testDir });
    await engine2.load();

    const log = engine2.getAuditLog();
    expect(log.length).toBeGreaterThan(0);
  });

  it('should persist and load users', async () => {
    const engine = new GovernanceEngine({ persistPath: testDir });
    engine.addUser({
      id: 'user-1',
      name: 'John Doe',
      roles: ['developer'],
      createdAt: new Date(),
      lastActive: new Date(),
    });

    await engine.persist();

    const engine2 = new GovernanceEngine({ persistPath: testDir });
    await engine2.load();

    expect(engine2.getUser('user-1')).toBeDefined();
  });
});

describe('GovernanceEngine PersistenceManager plugin', () => {
  it('load() uses persistence plugin when provided', async () => {
    const mockAuditEntries = [{
      id: 'audit-1', userId: 'u1', action: 'read', resource: 'res',
      timestamp: new Date(), success: true, details: undefined,
    }];
    const mockRoles = [{ name: 'custom-role', permissions: ['read'], description: 'Custom' }];

    const mockStore = {
      getAllRoles: async () => mockRoles,
      getAuditLog: async () => mockAuditEntries,
      saveRole: async () => {},
      saveUser: async () => {},
      saveAuditEntry: async () => {},
    };
    const mockPersistence = {
      getGovernanceStore: async () => mockStore as any,
    } as any;

    const engine = new GovernanceEngine({ persistence: mockPersistence });
    await engine.load();

    const log = engine.getAuditLog();
    expect(log).toHaveLength(1);
    expect(log[0].userId).toBe('u1');
    expect(engine.getRole('custom-role')).toBeDefined();
  });

  it('persist() uses persistence plugin when provided', async () => {
    const saved = { roles: [] as any[], users: [] as any[], entries: [] as any[] };
    const mockStore = {
      getAllRoles: async () => [],
      getAuditLog: async () => [],
      saveRole: async (r: any) => saved.roles.push(r),
      saveUser: async (u: any) => saved.users.push(u),
      saveAuditEntry: async (e: any) => saved.entries.push(e),
    };
    const mockPersistence = {
      getGovernanceStore: async () => mockStore as any,
    } as any;

    const engine = new GovernanceEngine({ persistence: mockPersistence });
    engine.addUser({ id: 'u1', name: 'Alice', roles: ['developer'], createdAt: new Date(), lastActive: new Date() });
    engine.hasPermission('u1', 'read', 'resource');
    await engine.persist();

    expect(saved.entries.length).toBeGreaterThan(0);
  });
});
