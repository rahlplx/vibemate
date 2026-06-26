// Vibemate Governance Module
// Provides RBAC, audit logging, and policy enforcement

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

export class GovernanceEngine {
  private roles: Map<string, Role> = new Map();
  private users: Map<string, User> = new Map();
  private auditLog: AuditEntry[] = [];
  private policies: Policy[] = [];

  constructor() {
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
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
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
