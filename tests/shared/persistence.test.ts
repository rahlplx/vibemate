import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { PersistenceManager, GovernanceStore, TelemetryStore, EvolveStore } from '../../src/shared/persistence.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

function getTestDb() {
  return join(import.meta.dir, '../../.vibe', `test-persistence-${randomUUID()}.db`);
}

function cleanupDb(dbPath: string) {
  if (existsSync(dbPath)) {
    try { unlinkSync(dbPath); } catch {}
  }
}

describe('PersistenceManager', () => {
  it('should create persistence manager', () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    expect(manager).toBeDefined();
    cleanupDb(dbPath);
  });

  it('should initialize database', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    expect(true).toBe(true);
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should get governance store', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getGovernanceStore();
    expect(store).toBeInstanceOf(GovernanceStore);
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should get telemetry store', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getTelemetryStore();
    expect(store).toBeInstanceOf(TelemetryStore);
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should get evolve store', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getEvolveStore();
    expect(store).toBeInstanceOf(EvolveStore);
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should close database', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    await manager.close();
    expect(true).toBe(true);
    cleanupDb(dbPath);
  });
});

describe('GovernanceStore', () => {
  it('should save and get role', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getGovernanceStore();
    
    await store.saveRole({ name: 'admin', permissions: ['read', 'write'], description: 'Admin role' });
    const role = await store.getRole('admin');
    expect(role).toBeDefined();
    expect(role?.name).toBe('admin');
    expect(role?.permissions).toEqual(['read', 'write']);
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should get all roles', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getGovernanceStore();
    
    await store.saveRole({ name: 'admin', permissions: ['read'], description: 'Admin' });
    await store.saveRole({ name: 'viewer', permissions: ['read'], description: 'Viewer' });
    const roles = await store.getAllRoles();
    expect(roles.length).toBe(2);
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should delete role', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getGovernanceStore();
    
    await store.saveRole({ name: 'admin', permissions: ['read'], description: 'Admin' });
    const deleted = await store.deleteRole('admin');
    expect(deleted).toBe(true);
    const role = await store.getRole('admin');
    expect(role).toBeUndefined();
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should save and get user', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getGovernanceStore();
    
    const now = new Date();
    await store.saveUser({ id: '1', name: 'Admin', roles: ['admin'], createdAt: now, lastActive: now });
    const user = await store.getUser('1');
    expect(user).toBeDefined();
    expect(user?.name).toBe('Admin');
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should delete user', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getGovernanceStore();
    
    const now = new Date();
    await store.saveUser({ id: '1', name: 'Admin', roles: ['admin'], createdAt: now, lastActive: now });
    const deleted = await store.deleteUser('1');
    expect(deleted).toBe(true);
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should save and get audit entry', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getGovernanceStore();
    
    await store.saveAuditEntry({
      id: '1',
      userId: 'user1',
      action: 'read',
      resource: '/api/data',
      timestamp: new Date(),
      success: true
    });
    const log = await store.getAuditLog();
    expect(log.length).toBe(1);
    expect(log[0].action).toBe('read');
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should filter audit log by userId', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getGovernanceStore();
    
    await store.saveAuditEntry({ id: '1', userId: 'user1', action: 'read', resource: '/', timestamp: new Date(), success: true });
    await store.saveAuditEntry({ id: '2', userId: 'user2', action: 'write', resource: '/', timestamp: new Date(), success: true });
    const log = await store.getAuditLog({ userId: 'user1' });
    expect(log.length).toBe(1);
    expect(log[0].userId).toBe('user1');
    
    await manager.close();
    cleanupDb(dbPath);
  });
});

describe('TelemetryStore', () => {
  it('should save and get span', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getTelemetryStore();
    
    await store.saveSpan({
      spanId: 'span-1',
      traceId: 'trace-1',
      name: 'test-span',
      startTime: Date.now(),
      status: 'ok',
      attributes: {},
      serviceName: 'test',
      serviceVersion: '1.0.0'
    });
    const span = await store.getSpan('span-1');
    expect(span).toBeDefined();
    expect(span?.name).toBe('test-span');
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should get trace', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getTelemetryStore();
    
    await store.saveSpan({ spanId: 'span-1', traceId: 'trace-1', name: 'span-1', startTime: Date.now(), status: 'ok', attributes: {}, serviceName: 'test', serviceVersion: '1.0.0' });
    await store.saveSpan({ spanId: 'span-2', traceId: 'trace-1', name: 'span-2', startTime: Date.now(), status: 'ok', attributes: {}, serviceName: 'test', serviceVersion: '1.0.0' });
    const trace = await store.getTrace('trace-1');
    expect(trace.length).toBe(2);
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should delete old spans', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getTelemetryStore();
    
    const oldTime = Date.now() - 7200000;
    await store.saveSpan({ spanId: 'old', traceId: 't1', name: 'old', startTime: oldTime, status: 'ok', attributes: {}, serviceName: 'test', serviceVersion: '1.0.0' });
    await store.saveSpan({ spanId: 'new', traceId: 't1', name: 'new', startTime: Date.now(), status: 'ok', attributes: {}, serviceName: 'test', serviceVersion: '1.0.0' });
    const deleted = await store.deleteOldSpans(3600000);
    expect(deleted).toBe(1);
    
    await manager.close();
    cleanupDb(dbPath);
  });
});

describe('EvolveStore', () => {
  it('should save and get rule', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getEvolveStore();
    
    await store.saveRule({
      id: 'rule-1',
      name: 'test-rule',
      description: 'Test rule',
      condition: 'always',
      action: 'do something',
      qualityScore: 0.8,
      lastUsed: new Date(),
      useCount: 5
    });
    const rule = await store.getRule('rule-1');
    expect(rule).toBeDefined();
    expect(rule?.name).toBe('test-rule');
    expect(rule?.qualityScore).toBe(0.8);
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should get all rules', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getEvolveStore();
    
    await store.saveRule({ id: 'r1', name: 'rule1', description: '', condition: '', action: '', qualityScore: 0.5, lastUsed: new Date(), useCount: 0 });
    await store.saveRule({ id: 'r2', name: 'rule2', description: '', condition: '', action: '', qualityScore: 0.9, lastUsed: new Date(), useCount: 0 });
    const rules = await store.getAllRules();
    expect(rules.length).toBe(2);
    expect(rules[0].qualityScore).toBe(0.9);
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should delete rule', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getEvolveStore();
    
    await store.saveRule({ id: 'r1', name: 'rule1', description: '', condition: '', action: '', qualityScore: 0.5, lastUsed: new Date(), useCount: 0 });
    const deleted = await store.deleteRule('r1');
    expect(deleted).toBe(true);
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should save and get principle', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getEvolveStore();
    
    await store.savePrinciple({
      id: 'p1',
      principle: 'Test principle',
      context: 'testing',
      effectiveness: 0.9,
      usageCount: 10,
      lastUsed: new Date()
    });
    const principle = await store.getPrinciple('p1');
    expect(principle).toBeDefined();
    expect(principle?.principle).toBe('Test principle');
    
    await manager.close();
    cleanupDb(dbPath);
  });

  it('should save and get learning', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getEvolveStore();

    await store.saveLearning({
      id: 'l1',
      timestamp: new Date(),
      type: 'success',
      description: 'Test learning',
      lesson: 'Learned something',
      tags: ['test'],
      utilityScore: 0.8
    });
    const learning = await store.getLearning('l1');
    expect(learning).toBeDefined();
    expect(learning?.lesson).toBe('Learned something');

    await manager.close();
    cleanupDb(dbPath);
  });

  it('should get all principles', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getEvolveStore();

    await store.savePrinciple({ id: 'p1', principle: 'P1', context: 'c', effectiveness: 0.9, usageCount: 1, lastUsed: new Date() });
    await store.savePrinciple({ id: 'p2', principle: 'P2', context: 'c', effectiveness: 0.5, usageCount: 2, lastUsed: new Date() });
    const principles = await store.getAllPrinciples();
    expect(principles.length).toBe(2);
    expect(principles[0].effectiveness).toBeGreaterThanOrEqual(principles[1].effectiveness);

    await manager.close();
    cleanupDb(dbPath);
  });

  it('should delete principle', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getEvolveStore();

    await store.savePrinciple({ id: 'p1', principle: 'P1', context: 'c', effectiveness: 0.9, usageCount: 1, lastUsed: new Date() });
    const deleted = await store.deletePrinciple('p1');
    expect(deleted).toBe(true);
    const gone = await store.getPrinciple('p1');
    expect(gone).toBeUndefined();

    await manager.close();
    cleanupDb(dbPath);
  });

  it('should get all learnings', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getEvolveStore();

    await store.saveLearning({ id: 'l1', timestamp: new Date(), type: 'success', description: 'D1', lesson: 'L1', tags: ['a'], utilityScore: 0.8 });
    await store.saveLearning({ id: 'l2', timestamp: new Date(), type: 'failure', description: 'D2', lesson: 'L2', tags: ['b', 'c'], utilityScore: 0.3 });
    const learnings = await store.getAllLearnings();
    expect(learnings.length).toBe(2);
    expect(Array.isArray(learnings[0].tags)).toBe(true);

    await manager.close();
    cleanupDb(dbPath);
  });

  it('should delete learning', async () => {
    const dbPath = getTestDb();
    const manager = new PersistenceManager({ dbPath });
    await manager.initialize();
    const store = await manager.getEvolveStore();

    await store.saveLearning({ id: 'l1', timestamp: new Date(), type: 'success', description: 'D1', lesson: 'L1', tags: [], utilityScore: 0.5 });
    const deleted = await store.deleteLearning('l1');
    expect(deleted).toBe(true);
    const gone = await store.getLearning('l1');
    expect(gone).toBeUndefined();

    await manager.close();
    cleanupDb(dbPath);
  });
});
