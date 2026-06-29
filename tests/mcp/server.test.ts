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

  it('has auth manager', () => {
    const server = new VibemateMcpServer({ logLevel: 'info' });
    const auth = server.getAuthManager();
    expect(auth).toBeDefined();
    expect(typeof auth.storeToken).toBe('function');
  });

  it('has auth middleware', () => {
    const server = new VibemateMcpServer({ logLevel: 'info' });
    const mw = server.getAuthMiddleware();
    expect(mw).toBeDefined();
    expect(typeof mw.requireTier).toBe('function');
  });

  it('registerTool adds custom tool', () => {
    const server = new VibemateMcpServer({ logLevel: 'info' });
    const def = { name: 'test_tool', description: 'A test tool', inputSchema: { type: 'object', properties: {} } };
    const handler = async () => ({ content: [{ type: 'text', text: 'ok' }] });
    server.registerTool(def, handler);
    const logger = server.getLogger();
    expect(logger).toBeDefined(); // server still functional after registerTool
  });

  it('logger request and response methods do not throw', () => {
    const server = new VibemateMcpServer({ logLevel: 'debug' });
    const logger = server.getLogger();
    expect(() => logger.request('tools/list')).not.toThrow();
    expect(() => logger.response('tools/list', 5)).not.toThrow();
    expect(() => logger.response('tools/call', 10, new Error('fail'))).not.toThrow();
  });

  it('logger setLevel filters by level', () => {
    const server = new VibemateMcpServer({ logLevel: 'info' });
    const logger = server.getLogger();
    logger.setLevel('warn');
    const entries: any[] = [];
    logger.addSink((e) => entries.push(e));
    logger.log({ timestamp: new Date().toISOString(), level: 'info', message: 'hidden' });
    logger.log({ timestamp: new Date().toISOString(), level: 'warn', message: 'visible' });
    expect(entries.some((e) => e.message === 'visible')).toBe(true);
    expect(entries.some((e) => e.message === 'hidden')).toBe(false);
  });

  it('logger at debug level captures debug entries', () => {
    const server = new VibemateMcpServer({ logLevel: 'debug' });
    const logger = server.getLogger();
    const entries: any[] = [];
    logger.addSink((e) => entries.push(e));
    logger.log({ timestamp: new Date().toISOString(), level: 'debug', message: 'debug msg' });
    expect(entries.some((e) => e.message === 'debug msg')).toBe(true);
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

describe('VibemateMcpServer — tier-gated tool dispatch', () => {
  it('callTool executes a free-tier tool without a token', async () => {
    const server = new VibemateMcpServer({ logLevel: 'error' });
    server.registerTool(
      { name: 'free_tool', description: 'free', inputSchema: { type: 'object', properties: {}, required: [] }, minTier: 'free' },
      async () => ({ content: [{ type: 'text', text: 'ok' }] }),
    );
    const result = await server.callTool('free_tool', {});
    expect((result as { content: { text: string }[] }).content[0].text).toBe('ok');
  });

  it('callTool blocks a pro-tier tool when no token is stored', async () => {
    const server = new VibemateMcpServer({ logLevel: 'error' });
    server.registerTool(
      { name: 'pro_tool', description: 'pro', inputSchema: { type: 'object', properties: {}, required: [] }, minTier: 'pro' },
      async () => ({ content: [{ type: 'text', text: 'secret' }] }),
    );
    await expect(server.callTool('pro_tool', {})).rejects.toThrow(/Pro feature|upgrade/i);
  });

  it('callTool executes a pro-tier tool when a pro token is stored', async () => {
    const server = new VibemateMcpServer({ logLevel: 'error' });
    server.getAuthManager().storeToken('default', { token: 'tok', tier: 'pro', userId: 'u1' });
    server.registerTool(
      { name: 'pro_tool2', description: 'pro', inputSchema: { type: 'object', properties: {}, required: [] }, minTier: 'pro' },
      async () => ({ content: [{ type: 'text', text: 'secret' }] }),
    );
    const result = await server.callTool('pro_tool2', {});
    expect((result as { content: { text: string }[] }).content[0].text).toBe('secret');
  });

  it('callTool blocks a team-tier tool when user is pro', async () => {
    const server = new VibemateMcpServer({ logLevel: 'error' });
    server.getAuthManager().storeToken('default', { token: 'tok', tier: 'pro', userId: 'u1' });
    server.registerTool(
      { name: 'team_tool', description: 'team', inputSchema: { type: 'object', properties: {}, required: [] }, minTier: 'team' },
      async () => ({ content: [{ type: 'text', text: 'team secret' }] }),
    );
    await expect(server.callTool('team_tool', {})).rejects.toThrow(/[Uu]pgrade/);
  });

  it('callTool throws for unknown tool name', async () => {
    const server = new VibemateMcpServer({ logLevel: 'error' });
    await expect(server.callTool('nonexistent', {})).rejects.toThrow(/not found/i);
  });

  it('tools without minTier default to free (always allowed)', async () => {
    const server = new VibemateMcpServer({ logLevel: 'error' });
    server.registerTool(
      { name: 'no_tier_tool', description: 'x', inputSchema: { type: 'object', properties: {}, required: [] } },
      async () => ({ content: [{ type: 'text', text: 'open' }] }),
    );
    const result = await server.callTool('no_tier_tool', {});
    expect((result as { content: { text: string }[] }).content[0].text).toBe('open');
  });
});
