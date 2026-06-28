import { describe, it, expect, beforeEach } from 'bun:test';
import { createAuthManager, type AuthToken, type AuthManager } from '../../src/mcp/auth.js';
import { createAuthMiddleware, type AuthMiddleware } from '../../src/mcp/auth-middleware.js';

describe('AuthMiddleware', () => {
  let auth: AuthManager;
  let middleware: AuthMiddleware;

  beforeEach(() => {
    auth = createAuthManager();
    middleware = createAuthMiddleware(auth);
  });

  describe('requireTier', () => {
    it('allows free skills without token', () => {
      const result = middleware.requireTier('free', 'default');
      expect(result.allowed).toBe(true);
    });

    it('blocks pro skills without token', () => {
      const result = middleware.requireTier('pro', 'default');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Pro feature');
    });

    it('allows pro skills with pro token', () => {
      const token: AuthToken = { token: 'vib-pro', tier: 'pro', expiresAt: Date.now() + 3600000 };
      auth.storeToken('default', token);
      const result = middleware.requireTier('pro', 'default');
      expect(result.allowed).toBe(true);
    });

    it('blocks pro skills with free token', () => {
      const token: AuthToken = { token: 'vib-free', tier: 'free', expiresAt: Date.now() + 3600000 };
      auth.storeToken('default', token);
      const result = middleware.requireTier('pro', 'default');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Upgrade');
    });

    it('allows team skills with team token', () => {
      const token: AuthToken = { token: 'vib-team', tier: 'team' };
      auth.storeToken('default', token);
      const result = middleware.requireTier('team', 'default');
      expect(result.allowed).toBe(true);
    });

    it('allows enterprise skills with enterprise token', () => {
      const token: AuthToken = { token: 'vib-ent', tier: 'enterprise' };
      auth.storeToken('default', token);
      const result = middleware.requireTier('enterprise', 'default');
      expect(result.allowed).toBe(true);
    });

    it('returns upgrade message with URL for users', () => {
      const token: AuthToken = { token: 'vib-free2', tier: 'free' };
      auth.storeToken('default', token);
      const result = middleware.requireTier('pro', 'default');
      expect(result.upgradeUrl).toContain('vibemate.dev');
    });

    it('blocks pro skills with expired token', () => {
      const token: AuthToken = { token: 'vib-exp', tier: 'pro', expiresAt: Date.now() - 1000 };
      auth.storeToken('default', token);
      const result = middleware.requireTier('pro', 'default');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('expired');
      expect(result.upgradeUrl).toContain('vibemate.dev');
    });
  });

  describe('requireAuth', () => {
    it('passes with valid token', () => {
      const token: AuthToken = { token: 'vib-ok', tier: 'free' };
      auth.storeToken('default', token);
      const result = middleware.requireAuth('default');
      expect(result.allowed).toBe(true);
      expect(result.userId).toBeUndefined();
    });

    it('blocks with expired token', () => {
      const token: AuthToken = { token: 'vib-exp', tier: 'pro', expiresAt: Date.now() - 1000 };
      auth.storeToken('default', token);
      const result = middleware.requireAuth('default');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('returns userId when present', () => {
      const token: AuthToken = { token: 'vib-user', tier: 'pro', userId: 'u-123' };
      auth.storeToken('default', token);
      const result = middleware.requireAuth('default');
      expect(result.allowed).toBe(true);
      expect(result.userId).toBe('u-123');
    });
  });

  describe('getTierDisplay', () => {
    it('returns human-readable tier name', () => {
      expect(middleware.getTierDisplay('free')).toBe('Free');
      expect(middleware.getTierDisplay('pro')).toBe('Pro');
      expect(middleware.getTierDisplay('team')).toBe('Team');
      expect(middleware.getTierDisplay('enterprise')).toBe('Enterprise');
    });
  });

  describe('checkSkinny', () => {
    it('returns error details for unauthorized access', () => {
      const result = middleware.requireTier('enterprise', 'nonexistent');
      expect(result.allowed).toBe(false);
      expect(result.tier).toBe('enterprise');
    });
  });
});
