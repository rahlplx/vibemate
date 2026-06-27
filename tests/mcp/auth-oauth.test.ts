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
    it('generates a valid URL with required params', async () => {
      const client = createOAuthClient(config);
      const url = await client.generateAuthUrl();
      expect(url).toContain('https://vibemate.dev/auth/authorize');
      expect(url).toContain('client_id=vibemate-cli');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('response_type=code');
      expect(url).toContain('state=');
    });

    it('includes scopes in URL', async () => {
      const client = createOAuthClient(config);
      const url = await client.generateAuthUrl();
      expect(url).toContain('scope=openid+profile+offline_access');
    });

    it('generates different state values each call', async () => {
      const client = createOAuthClient(config);
      const url1 = await client.generateAuthUrl();
      const url2 = await client.generateAuthUrl();
      const state1 = new URL(url1).searchParams.get('state');
      const state2 = new URL(url2).searchParams.get('state');
      expect(state1).not.toBe(state2);
    });

    it('includes PKCE code_challenge by default', async () => {
      const client = createOAuthClient(config);
      const url = await client.generateAuthUrl();
      const params = new URL(url).searchParams;
      expect(params.get('code_challenge')).toBeTruthy();
      expect(params.get('code_challenge_method')).toBe('S256');
    });

    it('excludes PKCE when usePKCE is false', async () => {
      const client = createOAuthClient({ ...config, usePKCE: false });
      const url = await client.generateAuthUrl();
      const params = new URL(url).searchParams;
      expect(params.get('code_challenge')).toBeNull();
      expect(params.get('code_challenge_method')).toBeNull();
    });
  });

  describe('validateState', () => {
    it('returns true for a valid state', async () => {
      const client = createOAuthClient(config);
      const url = await client.generateAuthUrl();
      const state = new URL(url).searchParams.get('state')!;
      expect(client.validateState(state)).toBe(true);
    });

    it('returns false for an invalid state', async () => {
      const client = createOAuthClient(config);
      await client.generateAuthUrl();
      expect(client.validateState('invalid-state')).toBe(false);
    });

    it('returns false after state is consumed', async () => {
      const client = createOAuthClient(config);
      const url = await client.generateAuthUrl();
      const state = new URL(url).searchParams.get('state')!;
      expect(client.validateState(state)).toBe(true);
      expect(client.validateState(state)).toBe(false);
    });
  });

  describe('exchangeCode', () => {
    it('exchanges code for token via callback URL', async () => {
      const http = await import('http');
      const server = http.createServer((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: 'vib-test-token-456', tier: 'pro', user_id: 'user-2', expires_in: 3600 }));
      });
      await new Promise<void>(r => server.listen(0, r));
      const port = (server.address() as { port: number }).port;
      try {
        const client = createOAuthClient({ ...config, tokenUrl: `http://localhost:${port}` });
        const token = await client.exchangeCode('test-auth-code');
        expect(token.token).toBe('vib-test-token-456');
        expect(token.tier).toBe('pro');
        expect(token.userId).toBe('user-2');
        expect(token.expiresAt).toBeGreaterThan(Date.now());
      } finally {
        server.close();
      }
    });

    it('sends code_verifier when PKCE is enabled', async () => {
      const http = await import('http');
      let receivedBody = '';
      const server = http.createServer((_req, res) => {
        let body = '';
        _req.on('data', chunk => body += chunk);
        _req.on('end', () => {
          receivedBody = body;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ access_token: 'vib-pkce-token', tier: 'pro', user_id: 'user-3' }));
        });
      });
      await new Promise<void>(r => server.listen(0, r));
      const port = (server.address() as { port: number }).port;
      try {
        const client = createOAuthClient({ ...config, tokenUrl: `http://localhost:${port}` });
        await client.generateAuthUrl();
        await client.exchangeCode('auth-code');
        expect(receivedBody).toContain('code_verifier=');
      } finally {
        server.close();
      }
    });

    it('does not send code_verifier when PKCE is disabled', async () => {
      const http = await import('http');
      let receivedBody = '';
      const server = http.createServer((_req, res) => {
        let body = '';
        _req.on('data', chunk => body += chunk);
        _req.on('end', () => {
          receivedBody = body;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ access_token: 'vib-nopkce-token', tier: 'free', user_id: 'user-4' }));
        });
      });
      await new Promise<void>(r => server.listen(0, r));
      const port = (server.address() as { port: number }).port;
      try {
        const client = createOAuthClient({ ...config, tokenUrl: `http://localhost:${port}`, usePKCE: false });
        await client.generateAuthUrl();
        await client.exchangeCode('auth-code');
        expect(receivedBody).not.toContain('code_verifier=');
      } finally {
        server.close();
      }
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
