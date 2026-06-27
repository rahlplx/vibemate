import { describe, it, expect } from 'bun:test';
import { VibemateMcpServer } from '../../src/mcp/index.js';
import { createAuthManager, createOAuthClient } from '../../src/mcp/auth.js';
import { createAuthMiddleware } from '../../src/mcp/auth-middleware.js';
import { createLogger } from '../../src/mcp/logging.js';

describe('VibemateMcpServer', () => {
  it('creates server with default config', () => {
    const server = new VibemateMcpServer({ logLevel: 'info' });
    expect(server).toBeDefined();
  });

  it('has logger', () => {
    const server = new VibemateMcpServer({ logLevel: 'info' });
    const logger = server.getLogger();
    expect(logger).toBeDefined();
  });

  it('has stack detector', () => {
    const server = new VibemateMcpServer({ logLevel: 'info' });
    const detector = server.getStackDetector();
    expect(detector).toBeDefined();
  });
});

describe('AuthManager', () => {
  it('stores and retrieves tokens', () => {
    const manager = createAuthManager();
    manager.storeToken('test-key', {
      token: 'test-token',
      tier: 'pro',
      userId: 'user-123',
    });

    const token = manager.getToken('test-key');
    expect(token).toBeDefined();
    expect(token?.tier).toBe('pro');
    expect(token?.userId).toBe('user-123');
  });

  it('returns undefined for missing tokens', () => {
    const manager = createAuthManager();
    const token = manager.getToken('nonexistent');
    expect(token).toBeUndefined();
  });

  it('returns null for expired tokens', () => {
    const manager = createAuthManager();
    manager.storeToken('expired-key', {
      token: 'expired',
      tier: 'free',
      expiresAt: Date.now() - 1000, // Expired
    });

    const token = manager.getToken('expired-key');
    expect(token).toBeNull();
  });

  it('validates tokens correctly', () => {
    const manager = createAuthManager();
    manager.storeToken('valid-key', {
      token: 'valid',
      tier: 'pro',
    });

    expect(manager.validateToken('valid-key')).toEqual({ valid: true, tier: 'pro' });
    expect(manager.validateToken('missing')).toEqual({ valid: false, reason: 'no_token' });
  });

  it('revokes tokens', () => {
    const manager = createAuthManager();
    manager.storeToken('revoke-key', { token: 'x', tier: 'free' });
    expect(manager.hasToken('revoke-key')).toBe(true);

    manager.revokeToken('revoke-key');
    expect(manager.hasToken('revoke-key')).toBe(false);
  });
});

describe('AuthMiddleware', () => {
  it('allows free tier without token', () => {
    const manager = createAuthManager();
    const middleware = createAuthMiddleware(manager);

    const check = middleware.requireTier('free');
    expect(check.allowed).toBe(true);
  });

  it('blocks pro tier without token', () => {
    const manager = createAuthManager();
    const middleware = createAuthMiddleware(manager);

    const check = middleware.requireTier('pro');
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Pro feature');
  });

  it('allows pro tier with pro token', () => {
    const manager = createAuthManager();
    manager.storeToken('default', {
      token: 'pro-token',
      tier: 'pro',
    });
    const middleware = createAuthMiddleware(manager);

    const check = middleware.requireTier('pro');
    expect(check.allowed).toBe(true);
  });

  it('blocks pro tier with free token', () => {
    const manager = createAuthManager();
    manager.storeToken('default', {
      token: 'free-token',
      tier: 'free',
    });
    const middleware = createAuthMiddleware(manager);

    const check = middleware.requireTier('pro');
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain('Upgrade');
  });

  it('returns tier display names', () => {
    const manager = createAuthManager();
    const middleware = createAuthMiddleware(manager);

    expect(middleware.getTierDisplay('free')).toBe('Free');
    expect(middleware.getTierDisplay('pro')).toBe('Pro');
    expect(middleware.getTierDisplay('team')).toBe('Team');
    expect(middleware.getTierDisplay('enterprise')).toBe('Enterprise');
  });
});

describe('OAuthClient', () => {
  it('generates auth URL', async () => {
    const client = createOAuthClient({
      clientId: 'test-client',
      redirectUri: 'http://localhost:3000/callback',
      authorizeUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: ['read', 'write'],
    });

    const url = await client.generateAuthUrl();
    expect(url).toContain('client_id=test-client');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=read+write');
  });

  it('validates state once', async () => {
    const client = createOAuthClient({
      clientId: 'test',
      redirectUri: 'http://localhost/callback',
      authorizeUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: [],
    });

    await client.generateAuthUrl();
    // State is generated internally, we can't access it directly
    // but we can verify that validateState returns false for wrong state
    expect(client.validateState('wrong-state')).toBe(false);
  });

  it('exchanges code for token', async () => {
    const http = await import('http');
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ access_token: 'vib-test-token-123', tier: 'pro', user_id: 'user-1' }));
    });
    await new Promise<void>(r => server.listen(0, r));
    const port = (server.address() as { port: number }).port;

    try {
      const client = createOAuthClient({
        clientId: 'test',
        redirectUri: 'http://localhost/callback',
        authorizeUrl: 'https://auth.example.com/authorize',
        tokenUrl: `http://localhost:${port}`,
        scopes: [],
      });

      const token = await client.exchangeCode('auth-code');
      expect(token.token).toBe('vib-test-token-123');
      expect(token.tier).toBe('pro');
      expect(token.userId).toBe('user-1');
    } finally {
      server.close();
    }
  });

  it('rejects empty code', async () => {
    const client = createOAuthClient({
      clientId: 'test',
      redirectUri: 'http://localhost/callback',
      authorizeUrl: 'https://auth.example.com/authorize',
      tokenUrl: 'https://auth.example.com/token',
      scopes: [],
    });

    await expect(client.exchangeCode('')).rejects.toThrow('authorization code is required');
  });
});

describe('McpLogger', () => {
  it('creates logger with default level', () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
  });

  it('creates logger with custom level', () => {
    const logger = createLogger({ logLevel: 'debug' });
    expect(logger).toBeDefined();
  });

  it('logs info messages', () => {
    const logger = createLogger({ logLevel: 'debug' });
    // Should not throw
    logger.info('test message');
  });

  it('logs error messages', () => {
    const logger = createLogger({ logLevel: 'debug' });
    logger.error('test error', new Error('test'));
  });
});
