import { describe, it, expect } from 'bun:test';
import { createOAuthClient, type OAuthClient, type OAuthConfig } from '../../src/mcp/auth.js';

describe('OAuthClient', () => {
  const config: OAuthConfig = {
    clientId: 'vibemate-cli',
    redirectUri: 'http://localhost:3456/callback',
    authorizeUrl: 'https://vibemate.dev/auth/authorize',
    tokenUrl: 'https://vibemate.dev/auth/token',
    scopes: ['openid', 'profile', 'offline_access'],
  };

  describe('generateAuthUrl', () => {
    it('generates a valid URL with required params', () => {
      const client = createOAuthClient(config);
      const url = client.generateAuthUrl();
      expect(url).toContain('https://vibemate.dev/auth/authorize');
      expect(url).toContain('client_id=vibemate-cli');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('state=');
    });

    it('includes scopes in URL', () => {
      const client = createOAuthClient(config);
      const url = client.generateAuthUrl();
      expect(url).toContain('scope=openid+profile+offline_access');
    });

    it('generates different state values each call', () => {
      const client = createOAuthClient(config);
      const url1 = client.generateAuthUrl();
      const url2 = client.generateAuthUrl();
      const state1 = new URL(url1).searchParams.get('state');
      const state2 = new URL(url2).searchParams.get('state');
      expect(state1).not.toBe(state2);
    });
  });

  describe('validateState', () => {
    it('returns true for a valid state', () => {
      const client = createOAuthClient(config);
      const url = client.generateAuthUrl();
      const state = new URL(url).searchParams.get('state')!;
      expect(client.validateState(state)).toBe(true);
    });

    it('returns false for an invalid state', () => {
      const client = createOAuthClient(config);
      client.generateAuthUrl();
      expect(client.validateState('invalid-state')).toBe(false);
    });

    it('returns false after state is consumed', () => {
      const client = createOAuthClient(config);
      const url = client.generateAuthUrl();
      const state = new URL(url).searchParams.get('state')!;
      expect(client.validateState(state)).toBe(true);
      expect(client.validateState(state)).toBe(false);
    });
  });

  describe('exchangeCode', () => {
    it('exchanges code for token via callback URL', async () => {
      const client = createOAuthClient(config);
      const token = await client.exchangeCode('test-auth-code');
      expect(token.token).toBeTruthy();
      expect(token.tier).toBe('free');
      expect(token.userId).toBeTruthy();
      expect(token.expiresAt).toBeGreaterThan(Date.now());
    });

    it('rejects empty code', async () => {
      const client = createOAuthClient(config);
      expect(client.exchangeCode('')).rejects.toThrow('authorization code is required');
    });
  });

  describe('startLocalServer', () => {
    it('starts and stops a local server', async () => {
      const client = createOAuthClient(config);
      const server = await client.startLocalServer(3456);
      expect(server.port).toBe(3456);
      server.close();
    });

    it('handles port already in use', async () => {
      const client = createOAuthClient(config);
      const server = await client.startLocalServer(3456);
      expect(server.port).toBe(3456);
      const client2 = createOAuthClient(config);
      expect(client2.startLocalServer(3456)).rejects.toThrow();
      server.close();
    });
  });
});
