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
