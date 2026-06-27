// Vibemate Governance Module
// Provides RBAC, audit logging, and policy enforcement
import { randomUUID } from 'crypto';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

export type Permission = 'read' | 'write' | 'execute' | 'admin';

export interface Role {
  name: string;
  permissions: Permission[];
  description: string;
}

export interface User {
  id: string;
  name: string;
  roles: string[];
  createdAt: Date;
  lastActive: Date;
}

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: Date;
  success: boolean;
  details?: Record<string, unknown>;
}

export interface Policy {
  name: string;
  condition: (context: PolicyContext) => boolean;
  action: 'allow' | 'deny';
  description: string;
}

export interface PolicyContext {
  user: User;
  action: Permission;
  resource: string;
  timestamp: Date;
}

export interface GovernanceConfig {
  persistPath?: string;
  maxAuditEntries?: number;
}

export class GovernanceEngine {
  private roles: Map<string, Role> = new Map();
  private users: Map<string, User> = new Map();
  private auditLog: AuditEntry[] = [];
  private policies: Policy[] = [];
  private config: GovernanceConfig;
  private persistPath?: string;

  constructor(config: GovernanceConfig = {}) {
    this.config = {
      maxAuditEntries: 10000,
      ...config
    };
    this.persistPath = config.persistPath;
    this.initializeDefaultRoles();
  }

  private initializeDefaultRoles(): void {
    this.roles.set('admin', {
      name: 'admin',
      permissions: ['read', 'write', 'execute', 'admin'],
      description: 'Full system access',
    });

    this.roles.set('developer', {
      name: 'developer',
      permissions: ['read', 'write', 'execute'],
      description: 'Development access',
    });

    this.roles.set('viewer', {
      name: 'viewer',
      permissions: ['read'],
      description: 'Read-only access',
    });
  }

  addRole(role: Role): void {
    this.roles.set(role.name, role);
  }

  getRole(name: string): Role | undefined {
    return this.roles.get(name);
  }

  addUser(user: User): void {
    this.users.set(user.id, user);
  }

  getUser(id: string): User | undefined {
    return this.users.get(id);
  }

  removeUser(id: string): boolean {
    return this.users.delete(id);
  }

  removeRole(name: string): boolean {
    return this.roles.delete(name);
  }

  hasPermission(userId: string, permission: Permission, resource: string): boolean {
    const user = this.users.get(userId);
    if (!user) {
      this.logAudit(userId, permission, resource, false, 'USER_NOT_FOUND');
      return false;
    }

    user.lastActive = new Date();

    const context: PolicyContext = {
      user,
      action: permission,
      resource,
      timestamp: new Date(),
    };

    for (const policy of this.policies) {
      if (policy.condition(context)) {
        this.logAudit(userId, permission, resource, policy.action === 'allow');
        return policy.action === 'allow';
      }
    }

    for (const roleName of user.roles) {
      const role = this.roles.get(roleName);
      if (role && role.permissions.includes(permission)) {
        this.logAudit(userId, permission, resource, true);
        return true;
      }
    }

    this.logAudit(userId, permission, resource, false);
    return false;
  }

  addPolicy(policy: Policy): void {
    this.policies.push(policy);
  }

  private logAudit(userId: string, action: string, resource: string, success: boolean, reason?: string): void {
    const entry: AuditEntry = {
      id: randomUUID(),
      userId,
      action,
      resource,
      timestamp: new Date(),
      success,
    };
    if (reason) {
      entry.details = { reason };
    }
    this.auditLog.push(entry);

    // Trim if exceeding max entries
    if (this.auditLog.length > (this.config.maxAuditEntries || 10000)) {
      this.auditLog = this.auditLog.slice(-Math.floor((this.config.maxAuditEntries || 10000) * 0.8));
    }
  }

  async persist(): Promise<void> {
    if (!this.persistPath) return;

    const dir = this.persistPath;
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const data = {
      roles: Array.from(this.roles.entries()),
      users: Array.from(this.users.entries()),
      auditLog: this.auditLog.slice(-1000), // Persist last 1000 entries
    };

    await writeFile(join(dir, 'governance.json'), JSON.stringify(data, null, 2));
  }

  async load(): Promise<void> {
    if (!this.persistPath) return;

    try {
      const content = await readFile(join(this.persistPath, 'governance.json'), 'utf-8');
      const data = JSON.parse(content);

      if (data.roles) {
        this.roles = new Map(data.roles);
      }
      if (data.users) {
        this.users = new Map(data.users.map((u: [string, User]) => [
          u[0],
          { ...u[1], createdAt: new Date(u[1].createdAt), lastActive: new Date(u[1].lastActive) }
        ]));
      }
      if (data.auditLog) {
        this.auditLog = data.auditLog.map((e: AuditEntry) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
      }
    } catch {
      // No existing data, start fresh
    }
  }

  getAuditLog(filters?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
  }): AuditEntry[] {
    let log = [...this.auditLog];

    if (filters) {
      if (filters.userId) {
        log = log.filter(entry => entry.userId === filters.userId);
      }
      if (filters.startDate) {
        log = log.filter(entry => entry.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        log = log.filter(entry => entry.timestamp <= filters.endDate!);
      }
      if (filters.success !== undefined) {
        log = log.filter(entry => entry.success === filters.success);
      }
    }

    return log;
  }

  getAuditStats(): {
    totalEntries: number;
    successful: number;
    failed: number;
    uniqueUsers: number;
  } {
    const entries = [...this.auditLog];
    return {
      totalEntries: entries.length,
      successful: entries.filter(e => e.success).length,
      failed: entries.filter(e => !e.success).length,
      uniqueUsers: new Set(entries.map(e => e.userId)).size,
    };
  }
}
