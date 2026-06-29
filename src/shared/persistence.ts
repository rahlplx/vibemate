import type { SQLiteAdapter } from '../state/adapter.js';
import { createSQLiteAdapter } from '../state/factory.js';

export interface PersistenceConfig {
  dbPath: string;
  enableWAL?: boolean;
}

export interface Migration {
  version: number;
  name: string;
  up: string;
  down: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'create_governance_tables',
    up: `
      CREATE TABLE IF NOT EXISTS governance_roles (
        name TEXT PRIMARY KEY,
        permissions TEXT NOT NULL,
        description TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS governance_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        roles TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_active TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS governance_audit_log (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        success INTEGER NOT NULL,
        details TEXT
      );
    `,
    down: `
      DROP TABLE IF EXISTS governance_audit_log;
      DROP TABLE IF EXISTS governance_users;
      DROP TABLE IF EXISTS governance_roles;
    `,
  },
  {
    version: 2,
    name: 'create_telemetry_tables',
    up: `
      CREATE TABLE IF NOT EXISTS telemetry_spans (
        span_id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        parent_span_id TEXT,
        name TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        status TEXT NOT NULL,
        attributes TEXT,
        service_name TEXT,
        service_version TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON telemetry_spans(trace_id);
      CREATE INDEX IF NOT EXISTS idx_spans_start_time ON telemetry_spans(start_time);
    `,
    down: `
      DROP TABLE IF EXISTS telemetry_spans;
    `,
  },
  {
    version: 3,
    name: 'create_evolve_tables',
    up: `
      CREATE TABLE IF NOT EXISTS evolve_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        condition TEXT NOT NULL,
        action TEXT NOT NULL,
        quality_score REAL NOT NULL,
        last_used TEXT NOT NULL,
        use_count INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS evolve_principles (
        id TEXT PRIMARY KEY,
        principle TEXT NOT NULL,
        context TEXT NOT NULL,
        effectiveness REAL NOT NULL,
        usage_count INTEGER NOT NULL,
        last_used TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS evolve_learnings (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        lesson TEXT NOT NULL,
        tags TEXT NOT NULL,
        utility_score REAL NOT NULL
      );
    `,
    down: `
      DROP TABLE IF EXISTS evolve_learnings;
      DROP TABLE IF EXISTS evolve_principles;
      DROP TABLE IF EXISTS evolve_rules;
    `,
  },
];

export class PersistenceManager {
  private adapter: SQLiteAdapter | null = null;
  private config: PersistenceConfig;
  private initPromise: Promise<void> | null = null;

  constructor(config: PersistenceConfig) {
    this.config = {
      enableWAL: true,
      ...config,
    };
  }

  private async getAdapter(): Promise<SQLiteAdapter> {
    if (!this.adapter) {
      this.adapter = createSQLiteAdapter(this.config.dbPath);
      if (this.config.enableWAL) {
        this.adapter.exec('PRAGMA journal_mode = WAL');
        this.adapter.exec('PRAGMA synchronous = NORMAL');
        this.adapter.exec('PRAGMA cache_size = -64000');
      }
    }
    return this.adapter;
  }

  async initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    const adapter = await this.getAdapter();

    adapter.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `);

    const applied = adapter.query<{ version: number }>('SELECT version FROM migrations');
    const appliedVersions = new Set(applied.map((r) => r.version));

    for (const migration of MIGRATIONS) {
      if (!appliedVersions.has(migration.version)) {
        adapter.exec(migration.up);
        adapter.prepare(
          'INSERT INTO migrations (version, name, applied_at) VALUES (?, ?, ?)'
        ).run(migration.version, migration.name, new Date().toISOString());
      }
    }
  }

  async close(): Promise<void> {
    if (this.initPromise) await this.initPromise;
    if (this.adapter) {
      this.adapter.close();
      this.adapter = null;
      this.initPromise = null;
    }
  }

  async getGovernanceStore(): Promise<GovernanceStore> {
    await this.initialize();
    return new GovernanceStore(await this.getAdapter());
  }

  async getTelemetryStore(): Promise<TelemetryStore> {
    await this.initialize();
    return new TelemetryStore(await this.getAdapter());
  }

  async getEvolveStore(): Promise<EvolveStore> {
    await this.initialize();
    return new EvolveStore(await this.getAdapter());
  }
}

export class GovernanceStore {
  constructor(private adapter: SQLiteAdapter) {}

  async saveRole(role: { name: string; permissions: string[]; description: string }): Promise<void> {
    this.adapter.prepare(
      'INSERT OR REPLACE INTO governance_roles (name, permissions, description) VALUES (?, ?, ?)'
    ).run(role.name, JSON.stringify(role.permissions), role.description);
  }

  async getRole(name: string): Promise<{ name: string; permissions: string[]; description: string } | undefined> {
    const rows = this.adapter.query<{ name: string; permissions: string; description: string }>(
      'SELECT * FROM governance_roles WHERE name = ?',
      [name]
    );
    const row = rows[0];
    if (!row) return undefined;
    return { ...row, permissions: JSON.parse(row.permissions) };
  }

  async getAllRoles(): Promise<Array<{ name: string; permissions: string[]; description: string }>> {
    const rows = this.adapter.query<{ name: string; permissions: string; description: string }>(
      'SELECT * FROM governance_roles'
    );
    return rows.map((row) => ({ ...row, permissions: JSON.parse(row.permissions) }));
  }

  async deleteRole(name: string): Promise<boolean> {
    const result = this.adapter.prepare('DELETE FROM governance_roles WHERE name = ?').run(name);
    return result.changes > 0;
  }

  async saveUser(user: { id: string; name: string; roles: string[]; createdAt: Date; lastActive: Date }): Promise<void> {
    this.adapter.prepare(
      'INSERT OR REPLACE INTO governance_users (id, name, roles, created_at, last_active) VALUES (?, ?, ?, ?, ?)'
    ).run(user.id, user.name, JSON.stringify(user.roles), user.createdAt.toISOString(), user.lastActive.toISOString());
  }

  async getUser(id: string): Promise<{ id: string; name: string; roles: string[]; createdAt: Date; lastActive: Date } | undefined> {
    const rows = this.adapter.query<{ id: string; name: string; roles: string; created_at: string; last_active: string }>(
      'SELECT * FROM governance_users WHERE id = ?',
      [id]
    );
    const row = rows[0];
    if (!row) return undefined;
    return {
      ...row,
      roles: JSON.parse(row.roles),
      createdAt: new Date(row.created_at),
      lastActive: new Date(row.last_active),
    };
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = this.adapter.prepare('DELETE FROM governance_users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async saveAuditEntry(entry: {
    id: string;
    userId: string;
    action: string;
    resource: string;
    timestamp: Date;
    success: boolean;
    details?: Record<string, unknown>;
  }): Promise<void> {
    this.adapter.prepare(
      'INSERT OR IGNORE INTO governance_audit_log (id, user_id, action, resource, timestamp, success, details) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(entry.id, entry.userId, entry.action, entry.resource, entry.timestamp.toISOString(), entry.success ? 1 : 0, entry.details ? JSON.stringify(entry.details) : null);
  }

  async getAuditLog(filters?: { userId?: string; startDate?: Date; endDate?: Date; success?: boolean }): Promise<Array<{
    id: string;
    userId: string;
    action: string;
    resource: string;
    timestamp: Date;
    success: boolean;
    details?: Record<string, unknown>;
  }>> {
    let sql = 'SELECT * FROM governance_audit_log WHERE 1=1';
    const params: unknown[] = [];

    if (filters?.userId) {
      sql += ' AND user_id = ?';
      params.push(filters.userId);
    }
    if (filters?.startDate) {
      sql += ' AND timestamp >= ?';
      params.push(filters.startDate.toISOString());
    }
    if (filters?.endDate) {
      sql += ' AND timestamp <= ?';
      params.push(filters.endDate.toISOString());
    }
    if (filters?.success !== undefined) {
      sql += ' AND success = ?';
      params.push(filters.success ? 1 : 0);
    }

    sql += ' ORDER BY timestamp DESC';

    const rows = this.adapter.query<{
      id: string;
      user_id: string;
      action: string;
      resource: string;
      timestamp: string;
      success: number;
      details: string | null;
    }>(sql, params);

    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      action: row.action,
      resource: row.resource,
      timestamp: new Date(row.timestamp),
      success: row.success === 1,
      details: row.details ? JSON.parse(row.details) : undefined,
    }));
  }
}

export class TelemetryStore {
  constructor(private adapter: SQLiteAdapter) {}

  async saveSpan(span: {
    spanId: string;
    traceId: string;
    parentSpanId?: string;
    name: string;
    startTime: number;
    endTime?: number;
    status: string;
    attributes: Record<string, unknown>;
    serviceName: string;
    serviceVersion: string;
  }): Promise<void> {
    this.adapter.prepare(
      'INSERT OR REPLACE INTO telemetry_spans (span_id, trace_id, parent_span_id, name, start_time, end_time, status, attributes, service_name, service_version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      span.spanId,
      span.traceId,
      span.parentSpanId || null,
      span.name,
      span.startTime,
      span.endTime || null,
      span.status,
      JSON.stringify(span.attributes),
      span.serviceName,
      span.serviceVersion
    );
  }

  async getSpan(spanId: string): Promise<{
    spanId: string;
    traceId: string;
    parentSpanId?: string;
    name: string;
    startTime: number;
    endTime?: number;
    status: string;
    attributes: Record<string, unknown>;
    serviceName: string;
    serviceVersion: string;
  } | undefined> {
    const rows = this.adapter.query<{
      span_id: string;
      trace_id: string;
      parent_span_id: string | null;
      name: string;
      start_time: number;
      end_time: number | null;
      status: string;
      attributes: string;
      service_name: string;
      service_version: string;
    }>('SELECT * FROM telemetry_spans WHERE span_id = ?', [spanId]);

    const row = rows[0];
    if (!row) return undefined;

    return {
      spanId: row.span_id,
      traceId: row.trace_id,
      parentSpanId: row.parent_span_id || undefined,
      name: row.name,
      startTime: row.start_time,
      endTime: row.end_time || undefined,
      status: row.status,
      attributes: JSON.parse(row.attributes),
      serviceName: row.service_name,
      serviceVersion: row.service_version,
    };
  }

  async getTrace(traceId: string): Promise<Array<{
    spanId: string;
    traceId: string;
    parentSpanId?: string;
    name: string;
    startTime: number;
    endTime?: number;
    status: string;
    attributes: Record<string, unknown>;
    serviceName: string;
    serviceVersion: string;
  }>> {
    const rows = this.adapter.query<{
      span_id: string;
      trace_id: string;
      parent_span_id: string | null;
      name: string;
      start_time: number;
      end_time: number | null;
      status: string;
      attributes: string;
      service_name: string;
      service_version: string;
    }>('SELECT * FROM telemetry_spans WHERE trace_id = ? ORDER BY start_time', [traceId]);

    return rows.map((row) => ({
      spanId: row.span_id,
      traceId: row.trace_id,
      parentSpanId: row.parent_span_id || undefined,
      name: row.name,
      startTime: row.start_time,
      endTime: row.end_time || undefined,
      status: row.status,
      attributes: JSON.parse(row.attributes),
      serviceName: row.service_name,
      serviceVersion: row.service_version,
    }));
  }

  async deleteOldSpans(maxAgeMs: number = 3600000): Promise<number> {
    const cutoff = Date.now() - maxAgeMs;
    const result = this.adapter.prepare('DELETE FROM telemetry_spans WHERE start_time < ?').run(cutoff);
    return result.changes;
  }
}

export class EvolveStore {
  constructor(private adapter: SQLiteAdapter) {}

  async saveRule(rule: {
    id: string;
    name: string;
    description: string;
    condition: string;
    action: string;
    qualityScore: number;
    lastUsed: Date;
    useCount: number;
  }): Promise<void> {
    this.adapter.prepare(
      'INSERT OR REPLACE INTO evolve_rules (id, name, description, condition, action, quality_score, last_used, use_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(rule.id, rule.name, rule.description, rule.condition, rule.action, rule.qualityScore, rule.lastUsed.toISOString(), rule.useCount);
  }

  async getRule(id: string): Promise<{
    id: string;
    name: string;
    description: string;
    condition: string;
    action: string;
    qualityScore: number;
    lastUsed: Date;
    useCount: number;
  } | undefined> {
    const rows = this.adapter.query<{
      id: string;
      name: string;
      description: string;
      condition: string;
      action: string;
      quality_score: number;
      last_used: string;
      use_count: number;
    }>('SELECT * FROM evolve_rules WHERE id = ?', [id]);

    const row = rows[0];
    if (!row) return undefined;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      condition: row.condition,
      action: row.action,
      qualityScore: row.quality_score,
      lastUsed: new Date(row.last_used),
      useCount: row.use_count,
    };
  }

  async getAllRules(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    condition: string;
    action: string;
    qualityScore: number;
    lastUsed: Date;
    useCount: number;
  }>> {
    const rows = this.adapter.query<{
      id: string;
      name: string;
      description: string;
      condition: string;
      action: string;
      quality_score: number;
      last_used: string;
      use_count: number;
    }>('SELECT * FROM evolve_rules ORDER BY quality_score DESC');

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      condition: row.condition,
      action: row.action,
      qualityScore: row.quality_score,
      lastUsed: new Date(row.last_used),
      useCount: row.use_count,
    }));
  }

  async deleteRule(id: string): Promise<boolean> {
    const result = this.adapter.prepare('DELETE FROM evolve_rules WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async savePrinciple(principle: {
    id: string;
    principle: string;
    context: string;
    effectiveness: number;
    usageCount: number;
    lastUsed: Date;
  }): Promise<void> {
    this.adapter.prepare(
      'INSERT OR REPLACE INTO evolve_principles (id, principle, context, effectiveness, usage_count, last_used) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(principle.id, principle.principle, principle.context, principle.effectiveness, principle.usageCount, principle.lastUsed.toISOString());
  }

  async getPrinciple(id: string): Promise<{
    id: string;
    principle: string;
    context: string;
    effectiveness: number;
    usageCount: number;
    lastUsed: Date;
  } | undefined> {
    const rows = this.adapter.query<{
      id: string;
      principle: string;
      context: string;
      effectiveness: number;
      usage_count: number;
      last_used: string;
    }>('SELECT * FROM evolve_principles WHERE id = ?', [id]);

    const row = rows[0];
    if (!row) return undefined;

    return {
      id: row.id,
      principle: row.principle,
      context: row.context,
      effectiveness: row.effectiveness,
      usageCount: row.usage_count,
      lastUsed: new Date(row.last_used),
    };
  }

  async getAllPrinciples(): Promise<Array<{
    id: string;
    principle: string;
    context: string;
    effectiveness: number;
    usageCount: number;
    lastUsed: Date;
  }>> {
    const rows = this.adapter.query<{
      id: string;
      principle: string;
      context: string;
      effectiveness: number;
      usage_count: number;
      last_used: string;
    }>('SELECT * FROM evolve_principles ORDER BY effectiveness DESC');

    return rows.map((row) => ({
      id: row.id,
      principle: row.principle,
      context: row.context,
      effectiveness: row.effectiveness,
      usageCount: row.usage_count,
      lastUsed: new Date(row.last_used),
    }));
  }

  async deletePrinciple(id: string): Promise<boolean> {
    const result = this.adapter.prepare('DELETE FROM evolve_principles WHERE id = ?').run(id);
    return result.changes > 0;
  }

  async saveLearning(learning: {
    id: string;
    timestamp: Date;
    type: string;
    description: string;
    lesson: string;
    tags: string[];
    utilityScore: number;
  }): Promise<void> {
    this.adapter.prepare(
      'INSERT OR REPLACE INTO evolve_learnings (id, timestamp, type, description, lesson, tags, utility_score) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(learning.id, learning.timestamp.toISOString(), learning.type, learning.description, learning.lesson, JSON.stringify(learning.tags), learning.utilityScore);
  }

  async getLearning(id: string): Promise<{
    id: string;
    timestamp: Date;
    type: string;
    description: string;
    lesson: string;
    tags: string[];
    utilityScore: number;
  } | undefined> {
    const rows = this.adapter.query<{
      id: string;
      timestamp: string;
      type: string;
      description: string;
      lesson: string;
      tags: string;
      utility_score: number;
    }>('SELECT * FROM evolve_learnings WHERE id = ?', [id]);

    const row = rows[0];
    if (!row) return undefined;

    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      type: row.type,
      description: row.description,
      lesson: row.lesson,
      tags: JSON.parse(row.tags),
      utilityScore: row.utility_score,
    };
  }

  async getAllLearnings(): Promise<Array<{
    id: string;
    timestamp: Date;
    type: string;
    description: string;
    lesson: string;
    tags: string[];
    utilityScore: number;
  }>> {
    const rows = this.adapter.query<{
      id: string;
      timestamp: string;
      type: string;
      description: string;
      lesson: string;
      tags: string;
      utility_score: number;
    }>('SELECT * FROM evolve_learnings ORDER BY timestamp DESC');

    return rows.map((row: {
      id: string;
      timestamp: string;
      type: string;
      description: string;
      lesson: string;
      tags: string;
      utility_score: number;
    }) => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      type: row.type,
      description: row.description,
      lesson: row.lesson,
      tags: JSON.parse(row.tags),
      utilityScore: row.utility_score,
    }));
  }

  async deleteLearning(id: string): Promise<boolean> {
    const result = this.adapter.prepare('DELETE FROM evolve_learnings WHERE id = ?').run(id);
    return result.changes > 0;
  }
}
