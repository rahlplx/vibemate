import { describe, it, expect, beforeEach } from 'bun:test';
import { createAuthManager, type AuthToken, type AuthManager } from '../../src/mcp/auth.js';

describe('AuthManager', () => {
  let auth: AuthManager;

  beforeEach(() => {
    auth = createAuthManager();
  });

  describe('storeToken', () => {
    it('stores a token and returns it', () => {
      const token: AuthToken = {
        token: 'vib-abc123',
        tier: 'free',
        expiresAt: Date.now() + 3600000,
        userId: 'user-1',
      };
      auth.storeToken('default', token);
      expect(auth.getToken('default')).toEqual(token);
    });

    it('overwrites existing token for same key', () => {
      const token1: AuthToken = { token: 'vib-abc', tier: 'free' };
      const token2: AuthToken = { token: 'vib-def', tier: 'pro' };
      auth.storeToken('default', token1);
      auth.storeToken('default', token2);
      expect(auth.getToken('default')?.token).toBe('vib-def');
    });
  });

  describe('getToken', () => {
    it('returns undefined for unknown key', () => {
      expect(auth.getToken('nonexistent')).toBeUndefined();
    });

    it('returns null for expired token', () => {
      const token: AuthToken = { token: 'vib-expired', tier: 'free', expiresAt: Date.now() - 1000 };
      auth.storeToken('expired', token);
      expect(auth.getToken('expired')).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('returns valid for active token', () => {
      const token: AuthToken = { token: 'vib-active', tier: 'pro', expiresAt: Date.now() + 3600000 };
      auth.storeToken('active', token);
      const result = auth.validateToken('active');
      expect(result.valid).toBe(true);
      expect(result.tier).toBe('pro');
    });

    it('returns invalid for missing token', () => {
      const result = auth.validateToken('missing');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('no_token');
    });

    it('returns invalid for expired token', () => {
      const token: AuthToken = { token: 'vib-gone', tier: 'free', expiresAt: Date.now() - 1000 };
      auth.storeToken('gone', token);
      const result = auth.validateToken('gone');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('expired');
    });

    it('returns valid for token without expiry', () => {
      const token: AuthToken = { token: 'vib-noexpiry', tier: 'enterprise' };
      auth.storeToken('perm', token);
      const result = auth.validateToken('perm');
      expect(result.valid).toBe(true);
      expect(result.tier).toBe('enterprise');
    });
  });

  describe('revokeToken', () => {
    it('removes stored token', () => {
      const token: AuthToken = { token: 'vib-revoke', tier: 'free' };
      auth.storeToken('revokable', token);
      auth.revokeToken('revokable');
      expect(auth.getToken('revokable')).toBeUndefined();
    });

    it('no-ops for nonexistent key', () => {
      expect(() => auth.revokeToken('nope')).not.toThrow();
    });
  });

  describe('getTier', () => {
    it('returns the tier for a stored token', () => {
      const token: AuthToken = { token: 'vib-tier', tier: 'team' };
      auth.storeToken('tiered', token);
      expect(auth.getTier('tiered')).toBe('team');
    });

    it('returns free for missing token', () => {
      expect(auth.getTier('missing')).toBe('free');
    });

    it('returns free for expired token', () => {
      const token: AuthToken = { token: 'vib-old', tier: 'pro', expiresAt: Date.now() - 1000 };
      auth.storeToken('old', token);
      expect(auth.getTier('old')).toBe('free');
    });
  });

  describe('hasToken', () => {
    it('returns true when token exists and valid', () => {
      const token: AuthToken = { token: 'vib-exists', tier: 'free', expiresAt: Date.now() + 3600000 };
      auth.storeToken('exists', token);
      expect(auth.hasToken('exists')).toBe(true);
    });

    it('returns false when token is expired', () => {
      const token: AuthToken = { token: 'vib-dead', tier: 'free', expiresAt: Date.now() - 1000 };
      auth.storeToken('dead', token);
      expect(auth.hasToken('dead')).toBe(false);
    });

    it('returns false when no token', () => {
      expect(auth.hasToken('missing')).toBe(false);
    });
  });

  describe('persistence', () => {
    it('loads tokens from initial storage', () => {
      const stored: AuthToken = { token: 'vib-persisted', tier: 'pro' };
      const authWithStorage = createAuthManager({ 'preloaded': stored });
      expect(authWithStorage.getToken('preloaded')?.token).toBe('vib-persisted');
    });

    it('allTokens returns all non-expired tokens', () => {
      const live: AuthToken = { token: 'vib-live', tier: 'free', expiresAt: Date.now() + 3600000 };
      const dead: AuthToken = { token: 'vib-dead2', tier: 'pro', expiresAt: Date.now() - 1000 };
      auth.storeToken('live', live);
      auth.storeToken('dead', dead);
      const all = auth.allTokens();
      expect(all.live).toEqual(live);
      expect(all.dead).toBeUndefined();
    });
  });
});
